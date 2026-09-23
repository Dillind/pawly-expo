-- A Follow Request can name Households the requester owns: the only places a
-- Follow Back can go. See ADR 0044.

create table public.follow_named_households (
  follow_id uuid not null references public.household_follows (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  primary key (follow_id, household_id)
);

create index follow_named_households_household_idx
  on public.follow_named_households (household_id);

-- No policy and no grant: only the definer functions below reach it.
alter table public.follow_named_households enable row level security;
revoke all on public.follow_named_households from anon, authenticated;

drop function public.request_follow(uuid);

create function public.request_follow(
  target_household_id uuid,
  named_household_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.household_follows;
begin
  if not exists (select 1 from public.households where id = target_household_id) then
    return jsonb_build_object('status', 'not_found');
  end if;

  if private.is_household_member(target_household_id) then
    return jsonb_build_object('status', 'already_member');
  end if;

  select * into existing
  from public.household_follows
  where household_id = target_household_id
    and follower_id = auth.uid();

  if found then
    if existing.status = 'removed' then
      return jsonb_build_object('status', 'blocked');
    end if;

    return jsonb_build_object('status', existing.status::text, 'id', existing.id);
  end if;

  insert into public.household_follows (household_id, follower_id)
  values (target_household_id, auth.uid())
  returning * into existing;

  -- Only what the caller owns: naming a Household promises its Owners' consent.
  insert into public.follow_named_households (follow_id, household_id)
  select existing.id, named.id
  from unnest(named_household_ids) as named(id)
  where named.id <> target_household_id
    and private.is_household_owner(named.id)
  on conflict do nothing;

  return jsonb_build_object('status', 'pending', 'id', existing.id);
end $$;

revoke execute on function public.request_follow(uuid, uuid[]) from public, anon;
grant execute on function public.request_follow(uuid, uuid[]) to authenticated;

-- The caller's own standing towards a Household, as a Follow Back button shows it.
create or replace function private.follow_back_relationship(target_household_id uuid)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select case
    when private.is_household_member(target_household_id) then 'member'
    else coalesce(
      (
        select case f.status when 'removed' then 'blocked' else f.status::text end
        from public.household_follows f
        where f.household_id = target_household_id
          and f.follower_id = auth.uid()
      ),
      'none'
    )
  end;
$$;

-- Owner only, like the table's own read policy. A named Household the
-- requester no longer owns is left out, checked now rather than when sent.
create or replace function public.list_household_follows(
  target_household_id uuid,
  follow_status public.follow_status
)
returns table (
  id uuid,
  follower_id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  requested_at timestamptz,
  responded_at timestamptz,
  named_households jsonb
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    f.id,
    f.follower_id,
    u.first_name,
    u.last_name,
    u.avatar_url,
    f.requested_at,
    f.responded_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'household_id', h.id,
            'name', h.name,
            'handle', h.handle,
            'relationship', private.follow_back_relationship(h.id)
          )
          order by h.name
        )
        from public.follow_named_households n
        join public.households h on h.id = n.household_id
        join public.household_members m
          on m.household_id = h.id and m.user_id = f.follower_id and m.role = 'owner'
        where n.follow_id = f.id
      ),
      '[]'::jsonb
    )
  from public.household_follows f
  left join public.users u on u.id = f.follower_id
  where f.household_id = target_household_id
    and f.status = follow_status
    and private.is_household_owner(target_household_id)
  order by
    case when follow_status = 'accepted' then f.responded_at else f.requested_at end asc;
$$;

revoke execute on function public.list_household_follows(uuid, public.follow_status) from public, anon;
grant execute on function public.list_household_follows(uuid, public.follow_status) to authenticated;

-- The pinned row. Unread counts only what the Inbox badge counts.
create or replace function public.follow_request_summary(target_household_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select case when not private.is_household_owner(target_household_id) then
    jsonb_build_object('pending_count', 0, 'newest', '[]'::jsonb, 'has_unread', false)
  else jsonb_build_object(
    'pending_count', (
      select count(*)::integer from public.household_follows f
      where f.household_id = target_household_id and f.status = 'pending'
    ),
    'newest', coalesce((
      select jsonb_agg(jsonb_build_object(
        'first_name', newest.first_name,
        'last_name', newest.last_name,
        'avatar_url', newest.avatar_url
      ) order by newest.requested_at desc)
      from (
        select u.first_name, u.last_name, u.avatar_url, f.requested_at
        from public.household_follows f
        left join public.users u on u.id = f.follower_id
        where f.household_id = target_household_id and f.status = 'pending'
        order by f.requested_at desc
        limit 2
      ) newest
    ), '[]'::jsonb),
    'has_unread', exists (
      select 1 from public.alerts a
      where a.household_id = target_household_id
        and a.kind = 'follow_requested'
        and a.created_at >= private.alert_window_start()
        and private.alert_is_mine(a.household_id, a.recipient_id)
        and not exists (
          select 1 from public.alert_reads r
          where r.alert_id = a.id and r.user_id = (select auth.uid())
        )
    )
  ) end;
$$;

revoke execute on function public.follow_request_summary(uuid) from public, anon;
grant execute on function public.follow_request_summary(uuid) to authenticated;

create or replace function public.mark_follow_request_alerts_read(target_household_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.alert_reads (alert_id, user_id)
  select a.id, (select auth.uid())
  from public.alerts a
  where a.household_id = target_household_id
    and a.kind = 'follow_requested'
    and a.created_at >= private.alert_window_start()
    and private.alert_is_mine(a.household_id, a.recipient_id)
  on conflict (alert_id, user_id) do nothing;
$$;

revoke execute on function public.mark_follow_request_alerts_read(uuid) from public, anon;
grant execute on function public.mark_follow_request_alerts_read(uuid) to authenticated;

-- The list leaves out follow_requested and the count keeps it. The pinned row
-- stands in for those rows, and reading it clears them (ADR 0044).
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
    and a.kind not in ('feed_logged', 'feed_due', 'follow_requested')
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
