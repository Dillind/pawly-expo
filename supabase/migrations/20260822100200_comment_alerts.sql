-- Comments reach the inbox. Two kinds, and they behave differently on purpose.
--
-- post_commented PUSHES. A comment is addressed to a person -- it is the one
-- social event in this app that asks for an answer, and a reply nobody sees
-- until they next open the app is a conversation that dies. This is the
-- opposite call to post_liked (20260815090100), and the difference is the
-- point: a thumbs-up is an acknowledgement, a comment is a message.
--
-- comment_liked does NOT push. It is a like, and 20260809090200 already said
-- why: the first time three pushes arrive because three people liked one
-- thing, the whole app gets muted -- including the Missed Feed Alert that
-- matters. It reaches the inbox and stops there, exactly as post_liked does.
--
-- ONE ROW PER RECIPIENT, unlike every kind before it. Household news carries a
-- null recipient and is resolved at send time (ADR 0012). A comment cannot: its
-- audience is "the people in this conversation", which is a set the alerts
-- table has no way to recompute later, because a comment deleted in the
-- meantime would silently drop someone who was in it when it happened.

-- One row per recipient per comment. A comment is inserted once so the trigger
-- fires once, and this constrains an invariant rather than resolving a race --
-- but the table-wide alerts_idempotency_idx cannot do the job, being
-- (kind, subject_id, subject_date) with a null subject_date and nulls distinct.
create unique index alerts_post_commented_once_idx
  on public.alerts (subject_id, recipient_id)
  where kind = 'post_commented';

create unique index alerts_comment_liked_once_idx
  on public.alerts (subject_id, actor_id)
  where kind = 'comment_liked';

-- Same reasoning as alerts_post_liked_has_recipient: a row with a null
-- recipient is household news, which is the exact inversion of an alert
-- addressed to the people in one conversation. The triggers below always set
-- one; this makes the table refuse the row if they ever stop.
alter table public.alerts
  add constraint alerts_comment_kinds_have_recipient
  check (kind not in ('post_commented', 'comment_liked') or recipient_id is not null);

create or replace function public.queue_post_commented_alert()
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

  if target_household_id is null then
    return new;
  end if;

  -- The post's author, plus everyone who already commented on it. `distinct`
  -- rather than one row per prior comment: a member who commented four times
  -- is one person and gets told once.
  --
  -- The actor is excluded at the end rather than in each branch, which also
  -- covers the case where you are answering yourself on your own post.
  insert into public.alerts
    (household_id, kind, subject_id, actor_id, recipient_id)
  -- The cast is load-bearing. `insert ... values` coerces an unknown literal to
  -- the target column's type; `insert ... select` does not, and this fails at
  -- runtime with "column kind is of type alert_kind but expression is of type
  -- text" -- inside a trigger, so it surfaces as a failed comment insert.
  select distinct
    target_household_id, 'post_commented'::public.alert_kind, new.id, new.author_id, recipient
  from (
    select post_author_id as recipient
    union
    select c.author_id
    from public.post_comments c
    where c.post_id = new.post_id
      and c.id <> new.id
  ) recipients
  where recipient is not null
    and recipient <> new.author_id
  on conflict (subject_id, recipient_id) where kind = 'post_commented' do nothing;

  return new;
end $$;

create trigger post_comments_queue_alert
after insert on public.post_comments
for each row
execute function public.queue_post_commented_alert();

revoke execute on function public.queue_post_commented_alert() from public, anon, authenticated;

create or replace function public.queue_comment_liked_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household_id uuid;
  comment_author_id uuid;
begin
  select posts.household_id, c.author_id
    into target_household_id, comment_author_id
  from public.post_comments c
  join public.posts on posts.id = c.post_id
  where c.id = new.comment_id;

  if target_household_id is null
    or comment_author_id is null
    or comment_author_id = new.user_id then
    return new;
  end if;

  -- suppressed_reason set unconditionally, so dispatch_alert returns early and
  -- nothing is pushed. Same shape as post_liked.
  insert into public.alerts
    (household_id, kind, subject_id, actor_id, recipient_id, suppressed_reason)
  values
    (target_household_id, 'comment_liked', new.comment_id, new.user_id,
     comment_author_id, 'like')
  on conflict (subject_id, actor_id) where kind = 'comment_liked' do nothing;

  return new;
end $$;

create trigger comment_likes_queue_alert
after insert on public.comment_likes
for each row
execute function public.queue_comment_liked_alert();

revoke execute on function public.queue_comment_liked_alert() from public, anon, authenticated;

-- Comments ride the existing Post Alerts preference rather than adding a
-- fourth toggle. They are the same feature to a member -- someone who has
-- turned off news about the photo stream has not asked to keep hearing about
-- the talk underneath it -- and a settings screen that distinguishes them is
-- asking a question nobody in a four-person household has an opinion about.

-- Dropped rather than replaced: the returned table gains three columns, and
-- `create or replace` cannot change a function's return type.
drop function if exists public.list_alerts(uuid, timestamptz, uuid, integer);

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
    -- A comment alert's subject is the comment, so its post has to be reached
    -- through it. Both halves resolve to the same route target.
    coalesce(post.id, comment_post.id) as post_id,
    coalesce(post.caption, comment_post.caption) as post_caption,
    comment.id as comment_id,
    comment.body as comment_body,
    -- These two drive the copy, which is a three-way split rather than a
    -- two-way one: a recipient can be in the thread while owning neither the
    -- post nor the parent, and "on your post" would be a lie to them. Derived
    -- rather than stored, so one kind carries all three sentences.
    --
    -- reply_to_user_id, NOT the parent's author. They differ whenever a reply
    -- answers a SIBLING: both flatten under the same parent, so the parent's
    -- author would be told "replied to your comment" about a sentence aimed at
    -- somebody else, and the person actually answered would get "also
    -- commented". The column exists precisely because the two are not the same.
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
