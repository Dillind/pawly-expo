-- A feed log already has two homes: Activity holds the history, Home holds
-- today. The bell was the third place saying the same thing, and on a real
-- household it drowned everything that had nowhere else to go.
--
-- The rows stay. `alerts` is the delivery outbox before it is an inbox, and a
-- missed_feed row is what stops the sweep pushing the same slot every fifteen
-- minutes. Only the readers change. A feed still pushes for anyone with Feed
-- Logged Alerts on -- dispatch is untouched.
--
-- The three readers move together, as ever: a row the list hides but the count
-- includes is a badge that cannot be cleared. See ADR 0023.

-- The return type loses feed_log_id, so this cannot be a create or replace.
drop function public.list_alerts(uuid, timestamptz, uuid, integer);

create function public.list_alerts(
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
    slot_pet.id as pet_id,
    slot_pet.name as pet_name,
    slot.label::text as slot_label,
    post.id as post_id,
    post.caption,
    subject_user.first_name,
    subject_user.last_name,
    a.subject_id = (select auth.uid()) as subject_is_me
  from public.alerts a
  left join public.users actor on actor.id = a.actor_id

  left join public.feeding_schedules slot on a.kind = 'missed_feed' and slot.id = a.subject_id
  left join public.pets slot_pet on slot_pet.id = slot.pet_id

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
    and a.kind <> 'feed_logged'
    and a.created_at >= private.alert_window_start()
    and private.alert_is_mine(a.household_id, a.recipient_id)
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
    and not exists (
      select 1 from public.alert_reads r
      where r.alert_id = a.id and r.user_id = (select auth.uid())
    );
$$;

revoke all on function public.unread_alert_count(uuid) from public;
grant execute on function public.unread_alert_count(uuid) to authenticated;

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
    and a.kind <> 'feed_logged'
    and a.created_at >= private.alert_window_start()
    and private.alert_is_mine(a.household_id, a.recipient_id)
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
  on conflict (alert_id, user_id) do nothing;
$$;

revoke all on function public.mark_all_alerts_read(uuid) from public;
grant execute on function public.mark_all_alerts_read(uuid) to authenticated;
