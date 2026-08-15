-- Narrows the "likes never queue an alert at all" note in 20260809090200. That
-- note was about PUSHES, which this still never sends: suppressed_reason is set
-- unconditionally, as the membership alerts do it (20260814090100), so
-- dispatch_alert returns early. See ADR 0021.

-- One row per person per post, forever. The table-wide alerts_idempotency_idx
-- cannot do this job: it is (kind, subject_id, subject_date), Postgres treats
-- nulls as distinct, and subject_date is null here -- so every like, including
-- an unlike followed by a second like, would be unique to it.
create unique index alerts_post_liked_once_idx
  on public.alerts (subject_id, actor_id)
  where kind = 'post_liked';

create or replace function public.queue_post_liked_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household_id uuid;
  post_author_id uuid;
begin
  select posts.household_id, posts.author_id
    into target_household_id, post_author_id
  from public.posts
  where posts.id = new.post_id;

  if target_household_id is null or post_author_id = new.user_id then
    return new;
  end if;

  insert into public.alerts (household_id, kind, subject_id, actor_id, suppressed_reason)
  values (target_household_id, 'post_liked', new.post_id, new.user_id, 'like')
  on conflict do nothing;

  return new;
end $$;

create trigger post_likes_queue_alert
after insert on public.post_likes
for each row
execute function public.queue_post_liked_alert();

-- Every SECURITY DEFINER trigger function in `public` needs this -- see the
-- note in 20260809090200.
revoke execute on function public.queue_post_liked_alert() from public, anon, authenticated;

-- A like is the first alert addressed to ONE member rather than the household,
-- so both readers below filter it to the post's author. They have to agree -- a
-- row the list hides but the count includes is a badge that cannot be cleared.
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
  feed_log_id uuid,
  post_id uuid,
  post_caption text,
  subject_first_name text,
  subject_last_name text,
  subject_is_me boolean
)
language sql
stable
security definer
set search_path = ''
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
    coalesce(log_pet.id, slot_pet.id) as pet_id,
    coalesce(log_pet.name, slot_pet.name) as pet_name,
    slot.label::text as slot_label,
    log.id as feed_log_id,
    post.id as post_id,
    post.caption,
    subject_user.first_name,
    subject_user.last_name,
    a.subject_id = (select auth.uid()) as subject_is_me
  from public.alerts a
  left join public.users actor on actor.id = a.actor_id

  left join public.feed_logs log on a.kind = 'feed_logged' and log.id = a.subject_id
  left join public.pets log_pet on log_pet.id = log.pet_id

  left join public.feeding_schedules slot on a.kind = 'missed_feed' and slot.id = a.subject_id
  left join public.pets slot_pet on slot_pet.id = slot.pet_id

  left join public.posts post
    on a.kind in ('post', 'post_liked') and post.id = a.subject_id

  left join public.users subject_user
    on a.kind in ('member_removed', 'member_role_changed', 'member_left')
    and subject_user.id = a.subject_id

  where a.household_id = target_household_id
    and private.is_household_member(target_household_id)
    -- Your own doing is not news to you. A membership alert is the exception
    -- worth noting: being removed is someone else's action, so it survives.
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
    and (a.kind <> 'post_liked' or post.author_id = (select auth.uid()))
    and (
      before_created_at is null
      or (a.created_at, a.id) < (before_created_at, before_id)
    )
  order by a.created_at desc, a.id desc
  limit least(page_size, 100);
$$;

revoke all on function public.list_alerts(uuid, timestamptz, uuid, integer) from public;
grant execute on function public.list_alerts(uuid, timestamptz, uuid, integer) to authenticated;

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
    and private.is_household_member(target_household_id)
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
    and (
      a.kind <> 'post_liked'
      or exists (
        select 1 from public.posts p
        where p.id = a.subject_id and p.author_id = (select auth.uid())
      )
    )
    and not exists (
      select 1 from public.alert_reads r
      where r.alert_id = a.id and r.user_id = (select auth.uid())
    );
$$;

revoke all on function public.unread_alert_count(uuid) from public;
grant execute on function public.unread_alert_count(uuid) to authenticated;
