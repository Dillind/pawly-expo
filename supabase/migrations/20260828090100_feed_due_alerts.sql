-- CRU-086. See docs/adr/0033-a-feed-due-alert-is-addressed-to-a-cohort.md.
--
-- A Feed Due Alert's subject is a COHORT, not an occurrence: one row per
-- (household, lead time, feed instant, local date). subject_id therefore holds
-- the household_id, which is the second row shape this table has ever carried.
-- A reader who assumes subject_id resolves to some other table is wrong on
-- exactly this kind.

alter table public.alerts
  add column lead_minutes smallint,
  add column subject_at timestamptz;

-- The table-wide key cannot serve feed_due: (kind, subject_id, subject_date)
-- collapses every feed instant and every lead time in a household on one day
-- into a single row, so the second cohort of the day would be swallowed
-- silently. It keeps its job for every other kind.
drop index public.alerts_idempotency_idx;

create unique index alerts_idempotency_idx
  on public.alerts (kind, subject_id, subject_date)
  where kind <> 'feed_due';

create unique index alerts_feed_due_idempotency_idx
  on public.alerts (kind, subject_id, subject_date, lead_minutes, subject_at)
  where kind = 'feed_due';

-- Splitting that index is not free, and this is the half that bites.
--
-- Postgres infers a PARTIAL unique index as an `on conflict` arbiter only when
-- the statement repeats the index predicate. `sweep_missed_feeds` did not, so
-- from the index change onward its insert raises 42P10 -- and its own per-pet
-- `exception when others` catches that and downgrades it to a warning. The
-- sweep keeps reporting success, the cron log stays green, and no household is
-- ever told about a missed feed again. Nothing in Jest can see this; the SQL is
-- out of its reach entirely.
--
-- Recreated verbatim from 20260820090600, changing ONLY the on-conflict clause.
-- The same move 20260815090200 made for post_liked.
create or replace function private.sweep_missed_feeds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  nudge_limit constant integer := 3;
  lookback constant interval := interval '30 minutes';
  inserted_total integer := 0;
  row_inserted integer;
  nudges integer;
  last_log_created_at timestamptz;
  local_date date;
  pet record;
  occurrence record;
begin
  for pet in
    select
      pets.id as pet_id,
      pets.household_id,
      households.timezone,
      make_interval(mins => households.grace_window_minutes) as grace
    from public.pets
    join public.households on households.id = pets.household_id
  loop
    begin
      select max(feed_logs.created_at) into last_log_created_at
      from public.feed_logs
      where feed_logs.pet_id = pet.pet_id;

      select count(*) into nudges
      from public.alerts
      where alerts.kind = 'missed_feed'
        and alerts.error is null
        and (last_log_created_at is null or alerts.created_at > last_log_created_at)
        and exists (
          select 1
          from public.feed_times
          where feed_times.series_id = alerts.subject_id
            and feed_times.pet_id = pet.pet_id
        );

      if nudges < nudge_limit then
        foreach local_date in array array[
          (now() at time zone pet.timezone)::date - 1,
          (now() at time zone pet.timezone)::date
        ]
        loop
          for occurrence in
            select states.series_id, states.scheduled_at
            from private.occurrence_states(pet.pet_id, local_date) as states
            where states.state = 'missed'
            order by states.scheduled_at asc
          loop
            if occurrence.scheduled_at + pet.grace < now() - lookback then
              continue;
            end if;

            insert into public.alerts (household_id, kind, subject_id, subject_date)
            values (pet.household_id, 'missed_feed', occurrence.series_id, local_date)
            on conflict (kind, subject_id, subject_date)
              where kind <> 'feed_due'
              do nothing;

            get diagnostics row_inserted = row_count;

            if row_inserted = 1 then
              nudges := nudges + 1;
              inserted_total := inserted_total + 1;

              exit when nudges >= nudge_limit;
            end if;
          end loop;

          exit when nudges >= nudge_limit;
        end loop;
      end if;
    exception
      when others then
        raise warning 'sweep_missed_feeds skipped pet %: %', pet.pet_id, sqlerrm;
    end;
  end loop;

  return inserted_total;
end;
$$;

-- Lead Time is a delivery preference, so it lives on the membership like every
-- other one (ADR 0012). It never reads the Grace Window: one says how long
-- BEFORE a feed the app nudges and the member owns it, the other says how long
-- AFTER a feed the app waits before calling it missed and the household owns it.
--
-- The default is true, unlike feed_logged_alerts. A due nudge never accuses,
-- and it is the reason the feature exists -- a member who never opens this
-- screen should still be nudged.
alter table public.household_members
  add column feed_due_alerts boolean not null default true,
  add column feed_due_lead_minutes smallint not null default 15
    constraint household_members_feed_due_lead_minutes_check
    check (feed_due_lead_minutes in (10, 15, 30, 60));

-- household_members takes COLUMN-level update grants (20260729082308), so a
-- preference is invisible to writes until it is named here. The failure is
-- silent: PostgREST reports success and the value reverts on the next refetch.
--
-- missed_feed_alerts is granted in the same breath. Its grant was withheld
-- deliberately because no UI exposed it; this ticket ships that UI.
grant update (feed_due_alerts, feed_due_lead_minutes, missed_feed_alerts)
  on public.household_members to authenticated;

-- Push only, exactly like feed_logged. The bell already holds Activity's
-- history of what happened; a nudge about what has not happened yet has no
-- place in it, and would be stale within the hour.
--
-- The three readers move together: a row the list hides but the count includes
-- is a badge that cannot be cleared. See ADR 0023.
create or replace function public.list_alerts(
  target_household_id uuid,
  before_created_at timestamptz default null,
  before_id uuid default null,
  page_size integer default 30
)
returns table (
  id uuid,
  kind public.alert_kind,
  created_at timestamptz,
  suppressed_reason text,
  is_read boolean,
  actor_first_name text,
  actor_last_name text,
  pet_id uuid,
  pet_name text,
  slot_label text,
  post_id uuid,
  post_caption text,
  comment_id uuid,
  comment_body text,
  comment_is_reply_to_me boolean,
  comment_post_is_mine boolean,
  subject_first_name text,
  subject_last_name text,
  subject_is_me boolean
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    a.id,
    a.kind,
    a.created_at,
    a.suppressed_reason,
    exists (
      select 1 from public.alert_reads r
      where r.alert_id = a.id and r.user_id = (select auth.uid())
    ) as is_read,
    actor.first_name,
    actor.last_name,
    occurrence_pet.id as pet_id,
    occurrence_pet.name as pet_name,
    occurrence.label::text as slot_label,
    coalesce(post.id, comment_post.id) as post_id,
    coalesce(post.caption, comment_post.caption) as post_caption,
    comment.id as comment_id,
    comment.body as comment_body,
    coalesce(comment.reply_to_user_id = (select auth.uid()), false)
      as comment_is_reply_to_me,
    coalesce(comment_post.author_id = (select auth.uid()), false)
      as comment_post_is_mine,
    subject_user.first_name,
    subject_user.last_name,
    a.subject_id = (select auth.uid()) as subject_is_me
  from public.alerts a
  left join public.users actor on actor.id = a.actor_id

  left join lateral (
    select feed_times.pet_id, feed_times.label
    from public.feed_times
    where a.kind = 'missed_feed'
      and feed_times.series_id = a.subject_id
      and feed_times.effective @> a.subject_date
    limit 1
  ) occurrence on true
  left join public.pets occurrence_pet on occurrence_pet.id = occurrence.pet_id

  left join public.posts post
    on a.kind in ('post', 'post_liked') and post.id = a.subject_id

  left join public.post_comments comment
    on a.kind in ('post_commented', 'comment_liked') and comment.id = a.subject_id
  left join public.posts comment_post on comment_post.id = comment.post_id

  left join public.users subject_user
    on a.kind in ('member_removed', 'member_role_changed', 'member_left')
    and subject_user.id = a.subject_id

  where a.household_id = target_household_id
    and a.kind not in ('feed_logged', 'feed_due')
    and a.created_at >= private.alert_window_start()
    and private.alert_is_mine(a.household_id, a.recipient_id)
    -- Your own doing is not news to you. A membership alert is the exception
    -- worth noting: being removed is someone else's action, so it survives.
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
    and (
      before_created_at is null
      or (a.created_at, a.id) < (before_created_at, before_id)
    )
  order by a.created_at desc, a.id desc
  limit least(page_size, 100);
$$;

revoke execute on function public.list_alerts(uuid, timestamptz, uuid, integer) from public, anon;
grant execute on function public.list_alerts(uuid, timestamptz, uuid, integer) to authenticated, service_role;

create or replace function public.unread_alert_count(target_household_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.alerts a
  where a.household_id = target_household_id
    and a.kind not in ('feed_logged', 'feed_due')
    and a.created_at >= private.alert_window_start()
    and private.alert_is_mine(a.household_id, a.recipient_id)
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
    and not exists (
      select 1 from public.alert_reads r
      where r.alert_id = a.id and r.user_id = (select auth.uid())
    );
$$;

-- anon named explicitly: `revoke ... from public` leaves an older direct grant
-- to anon in place, and the linter has been reporting this one as callable
-- without signing in. list_alerts has always named anon; this catches up.
revoke execute on function public.unread_alert_count(uuid) from public, anon;
grant execute on function public.unread_alert_count(uuid) to authenticated;

-- The third reader. ADR 0023: the list, the count and the read-marker move
-- together. This one sweeps by household rather than by a list of ids, so
-- without the same filter every "mark all read" writes an alert_reads row for
-- a feed_due alert that no screen can show -- junk that accumulates for as long
-- as the household keeps being nudged.
create or replace function public.mark_all_alerts_read(target_household_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.alert_reads (alert_id, user_id)
  select a.id, (select auth.uid())
  from public.alerts a
  where a.household_id = target_household_id
    and a.kind not in ('feed_logged', 'feed_due')
    and a.created_at >= private.alert_window_start()
    and private.alert_is_mine(a.household_id, a.recipient_id)
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
  on conflict (alert_id, user_id) do nothing;
$$;

revoke execute on function public.mark_all_alerts_read(uuid) from public, anon;
grant execute on function public.mark_all_alerts_read(uuid) to authenticated;
