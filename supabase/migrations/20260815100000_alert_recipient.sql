-- The inbox stops being "your household's alerts" and becomes "your alerts".
--
-- Null recipient means household news -- everyone is told. A set recipient
-- means the alert is addressed to one person. An invite is the case that
-- forces this: an invitee is not a member yet, so no household-scoped rule can
-- reach them at all.
--
-- This lays the schema, not the whole route. The RLS policy below is already
-- household-agnostic, but list_alerts still takes a target_household_id, so an
-- invitee has no household to ask for. Dropping that argument is #44 and
-- CRU-059. See ADR 0021, amended.

alter table public.alerts
  add column recipient_id uuid references auth.users (id) on delete cascade;

create index alerts_recipient_recent_idx
  on public.alerts (recipient_id, created_at desc)
  where recipient_id is not null;

-- Every existing kind is household news except post_liked, which CRU-048
-- addressed to the post's author with a bespoke `where` clause.
update public.alerts a
set recipient_id = p.author_id
from public.posts p
where a.kind = 'post_liked'
  and p.id = a.subject_id;

-- subject_id is polymorphic and carries no foreign key, so the join above
-- matches nothing for a like whose post was already deleted -- and a like left
-- with a null recipient is household news, which is the exact inversion of
-- "nobody hears about attention paid to someone else's post". It found no such
-- rows, and the trigger below always sets a recipient, so this constrains an
-- invariant rather than fixing a live fault. It is stated here because nothing
-- else makes it true: the trigger being correct is not the same as the table
-- refusing the row.
alter table public.alerts
  add constraint alerts_post_liked_has_recipient
  check (kind <> 'post_liked' or recipient_id is not null);

-- Called by the list, the count, both mark-read RPCs and the RLS policy, so
-- they cannot drift: a row the list hides but the count includes is a badge
-- that cannot be cleared.
--
-- Not SECURITY DEFINER, unlike the rest of this file -- it reads no tables of
-- its own, and is_household_member is already definer.
create or replace function private.alert_is_mine(
  alert_household_id uuid,
  alert_recipient_id uuid
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select case
    when alert_recipient_id is null then private.is_household_member(alert_household_id)
    else alert_recipient_id = (select auth.uid())
  end;
$$;

-- Executable by the caller, unlike the rest of this file: an RLS policy
-- expression is evaluated as the querying role, so a revoke makes the policy
-- fail with "permission denied" rather than return false.
revoke execute on function private.alert_is_mine(uuid, uuid) from public, anon;
grant execute on function private.alert_is_mine(uuid, uuid) to authenticated, service_role;

-- Scope only. "Your own doing is not news to you" is a separate rule, and it
-- belongs to the readers below rather than to permission -- being unable to
-- SELECT a row you caused is a surprise waiting to happen.
drop policy "Members can view their household's alerts" on public.alerts;

create policy "Members can view alerts addressed to them or their household"
  on public.alerts
  for select
  to authenticated
  using (private.alert_is_mine(household_id, recipient_id));

-- The insert policy gated on household membership, which an invitee fails --
-- they could see the alert and never mark it read.
drop policy "Users can mark alerts they can see as read" on public.alert_reads;

create policy "Users can mark alerts they can see as read"
  on public.alert_reads
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.alerts
      where alerts.id = alert_reads.alert_id
        and private.alert_is_mine(alerts.household_id, alerts.recipient_id)
    )
  );

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

  insert into public.alerts
    (household_id, kind, subject_id, actor_id, recipient_id, suppressed_reason)
  values
    (target_household_id, 'post_liked', new.post_id, new.user_id, post_author_id, 'like')
  on conflict (subject_id, actor_id) where kind = 'post_liked' do nothing;

  return new;
end $$;

revoke execute on function public.queue_post_liked_alert() from public, anon, authenticated;

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
    and private.alert_is_mine(a.household_id, a.recipient_id)
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
    and not exists (
      select 1 from public.alert_reads r
      where r.alert_id = a.id and r.user_id = (select auth.uid())
    );
$$;

revoke all on function public.unread_alert_count(uuid) from public;
grant execute on function public.unread_alert_count(uuid) to authenticated;

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
    and private.alert_is_mine(a.household_id, a.recipient_id)
  on conflict (alert_id, user_id) do nothing;
$$;

revoke all on function public.mark_alerts_read(uuid[]) from public;
grant execute on function public.mark_alerts_read(uuid[]) to authenticated;

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
    and private.alert_is_mine(a.household_id, a.recipient_id)
    and (a.actor_id is null or a.actor_id <> (select auth.uid()))
  on conflict (alert_id, user_id) do nothing;
$$;

revoke all on function public.mark_all_alerts_read(uuid) from public;
grant execute on function public.mark_all_alerts_read(uuid) to authenticated;
