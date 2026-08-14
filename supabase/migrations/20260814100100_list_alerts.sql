-- The inbox's read model.
--
-- An alert's subject_id is polymorphic: a feed_logs id for feed_logged, a
-- feeding_schedules id for missed_feed, a posts id for post, and a user id for
-- the three membership kinds. PostgREST cannot embed that -- there is no
-- foreign key to follow, and there could not be one -- so resolution happens
-- here and the client receives a flat row it only has to phrase.
--
-- security definer so a name resolves even when the subject has since left:
-- the users select policy needs a shared household, and someone removed no
-- longer has one. They were a member when it happened, so the row naming them
-- leaks nothing the reader did not already see. Membership is still enforced,
-- in the where clause below.

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

  left join public.posts post on a.kind = 'post' and post.id = a.subject_id

  left join public.users subject_user
    on a.kind in ('member_removed', 'member_role_changed', 'member_left')
    and subject_user.id = a.subject_id

  where a.household_id = target_household_id
    and private.is_household_member(target_household_id)
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

revoke all on function public.list_alerts(uuid, timestamptz, uuid, integer) from public;
grant execute on function public.list_alerts(uuid, timestamptz, uuid, integer) to authenticated;

-- The bell's badge. Counting through list_alerts would mean paging the whole
-- history to find out whether the dot shows.
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
    and not exists (
      select 1 from public.alert_reads r
      where r.alert_id = a.id and r.user_id = (select auth.uid())
    );
$$;

revoke all on function public.unread_alert_count(uuid) from public;
grant execute on function public.unread_alert_count(uuid) to authenticated;

-- Marking read is insert-only and idempotent, so re-reading a screen costs one
-- statement and conflicts with nothing.
create or replace function public.mark_alerts_read(alert_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.alert_reads (alert_id, user_id)
  select a.id, (select auth.uid())
  from public.alerts a
  where a.id = any(alert_ids)
    and private.is_household_member(a.household_id)
  on conflict (alert_id, user_id) do nothing;
$$;

revoke all on function public.mark_alerts_read(uuid[]) from public;
grant execute on function public.mark_alerts_read(uuid[]) to authenticated;

-- "Mark all read" without shipping the whole history to the client to do it.
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
    and private.is_household_member(target_household_id)
  on conflict (alert_id, user_id) do nothing;
$$;

revoke all on function public.mark_all_alerts_read(uuid) from public;
grant execute on function public.mark_all_alerts_read(uuid) to authenticated;
