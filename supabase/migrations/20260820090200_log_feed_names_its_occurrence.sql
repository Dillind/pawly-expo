-- Phase 3 of CRU-066.
--
-- Three things move together, because splitting them leaves a window where a
-- missed_feed alert points at a row id that no longer identifies anything:
-- log_feed, the missed-feed sweep, and list_alerts.

-- 1. alerts.subject_id for a missed_feed becomes the series_id.
--
-- The idempotency index is (kind, subject_id, subject_date). A row id changes
-- on every edit under versioning, so leaving it would re-notify a household
-- about a day it was already told about. Backfill first, or the sweep inserts
-- a second alert for every day already nudged.

update public.alerts
set subject_id = feed_times.series_id
from public.feeding_schedules
join public.feed_times
  on feed_times.pet_id = feeding_schedules.pet_id
 and feed_times.label = feeding_schedules.label
 and feed_times.local_time = feeding_schedules.scheduled_time
 and feed_times.created_at = feeding_schedules.created_at
where alerts.kind = 'missed_feed'
  and alerts.subject_id = feeding_schedules.id;

-- 2. A feed logged late is still that feed.
--
-- The 30-minute rule recorded a late log as a Suppressed Alert and pushed
-- nothing. ADR 0029 removes it: a log now names the feed it satisfies, so
-- lateness no longer makes it ambiguous, and the household still wants to know
-- the pet was fed.

create or replace function public.queue_feed_logged_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household_id uuid;
begin
  select pets.household_id into target_household_id
  from public.pets
  where pets.id = new.pet_id;

  if target_household_id is null then
    return new;
  end if;

  insert into public.alerts (household_id, kind, subject_id, actor_id)
  values (target_household_id, 'feed_logged', new.id, new.logged_by);

  return new;
end;
$$;

-- 3. log_feed takes the occurrence.
--
-- The two new arguments carry defaults and sit last, so the existing
-- four-argument call from the client keeps working until phase 4 updates it.
-- Both null is an Extra Feed, which satisfies nothing and can never be a
-- Double Feed.

create or replace function public.log_feed(
  target_pet_id uuid,
  target_logged_at timestamptz default now(),
  target_notes text default null,
  confirmed boolean default false,
  target_series_id uuid default null,
  target_occurrence_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  household_timezone text;
  existing_log public.feed_logs%rowtype;
  occurrence_label public.feeding_schedule_label;
  occurrence_time time;
  new_log_id uuid;
  write_series_id uuid := target_series_id;
  write_occurrence_date date := target_occurrence_date;
begin
  -- Kept from 20260726090200. The Double Feed check is now a lookup rather
  -- than a derivation, but two callers still race: without the lock both read
  -- a snapshot taken before the other's insert, both find no existing log, and
  -- the second one hits the unique index as a raw error instead of a warning.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_pet_id::text, 0));

  select households.timezone into household_timezone
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  -- Not "pet does not exist" -- RLS on pets means a non-member reads no row,
  -- so the two cases are indistinguishable from here and must stay that way.
  if household_timezone is null then
    raise exception 'Pet not found' using errcode = '42501';
  end if;

  if (target_series_id is null) <> (target_occurrence_date is null) then
    raise exception 'An occurrence needs both a series and a date'
      using errcode = '22023';
  end if;

  if target_series_id is not null then
    select * into existing_log
    from public.feed_logs
    where feed_logs.feed_time_series_id = target_series_id
      and feed_logs.occurrence_date = target_occurrence_date;

    if found and not confirmed then
      select feed_times.label, feed_times.local_time
        into occurrence_label, occurrence_time
      from public.feed_times
      where feed_times.series_id = target_series_id
        and feed_times.effective @> target_occurrence_date;

      return jsonb_build_object(
        'status', 'double_feed',
        'occurrence', jsonb_build_object(
          'series_id', target_series_id,
          'occurrence_date', target_occurrence_date,
          'label', occurrence_label,
          'local_time', occurrence_time
        ),
        'existing', jsonb_build_object(
          'id', existing_log.id,
          'logged_at', existing_log.logged_at,
          'logged_by', existing_log.logged_by
        )
      );
    end if;

    -- A confirmed second feed against an already-satisfied occurrence is
    -- written as an Extra Feed. The pet really was fed again, so the log has
    -- to exist; the occurrence is already satisfied, so it satisfies nothing.
    -- Writing it against the occurrence would violate the unique index.
    if found then
      write_series_id := null;
      write_occurrence_date := null;
    end if;
  end if;

  insert into public.feed_logs
    (pet_id, logged_by, logged_at, notes, feed_time_series_id, occurrence_date)
  values (
    target_pet_id,
    (select auth.uid()),
    target_logged_at,
    nullif(btrim(target_notes), ''),
    write_series_id,
    write_occurrence_date
  )
  returning id into new_log_id;

  return jsonb_build_object(
    'status', 'logged',
    'log_id', new_log_id,
    'is_extra_feed', write_series_id is null
  );
end;
$$;

revoke execute on function public.log_feed(uuid, timestamptz, text, boolean, uuid, date) from public, anon;
grant execute on function public.log_feed(uuid, timestamptz, text, boolean, uuid, date) to authenticated;

-- The old four-argument signature is now ambiguous against the new one for a
-- four-argument call, so it has to go. Nothing else referenced it.
drop function if exists public.log_feed(uuid, timestamptz, text, boolean);

-- 4. The sweep reads occurrences.
--
-- A paused day comes back with no occurrences, so "skip paused pets" needs no
-- clause of its own. subject_id is the series_id in both the count and the
-- insert; a mismatch between those two would nudge three times per edit.

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
    -- households.timezone is unconstrained text set by the client, so
    -- `now() at time zone` can raise. Without this block that raise unwinds the
    -- whole function and every household loses the run, not just the broken one.
    begin
      -- created_at, not logged_at: the question is whether a human is still using
      -- the app, and someone backdating a log has just proved they are.
      select max(feed_logs.created_at) into last_log_created_at
      from public.feed_logs
      where feed_logs.pet_id = pet.pet_id;

      -- `error is null` counts alerts that were delivered or are still in
      -- flight, never ones that reached nobody. A fully muted household would
      -- otherwise burn its three nudges in silence.
      select count(*) into nudges
      from public.alerts
      join public.feed_times on feed_times.series_id = alerts.subject_id
      where alerts.kind = 'missed_feed'
        and feed_times.pet_id = pet.pet_id
        and alerts.error is null
        and (last_log_created_at is null or alerts.created_at > last_log_created_at);

      if nudges < nudge_limit then
        -- Yesterday too: a late-evening window can close after local midnight.
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

            -- on conflict is what makes the 15-minute cadence safe.
            insert into public.alerts (household_id, kind, subject_id, subject_date)
            values (pet.household_id, 'missed_feed', occurrence.series_id, local_date)
            on conflict (kind, subject_id, subject_date) do nothing;

            get diagnostics row_inserted = row_count;

            if row_inserted = 1 then
              nudges := nudges + 1;
              inserted_total := inserted_total + 1;

              -- Counted as we insert, so a pet at 2 cannot land at 5 in one run.
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

-- 5. list_alerts joins the version that was in effect on the day it nudged
-- about, not the current one. That is the whole point of versioning: the
-- alert must read as it did when it was sent.

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
    post.id as post_id,
    post.caption,
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

  left join public.users subject_user
    on a.kind in ('member_removed', 'member_role_changed', 'member_left')
    and subject_user.id = a.subject_id

  where a.household_id = target_household_id
    and a.kind <> 'feed_logged'
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
