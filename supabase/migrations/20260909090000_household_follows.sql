-- Follows. See ADR 0036.
--
-- A Follow is on a HOUSEHOLD, never on a Pet: a Pet moves household, and a
-- pet-level follow would need its own accept flow and multiply this file's
-- policy surface.
--
-- Every write goes through an RPC and there is no INSERT/UPDATE/DELETE policy
-- anywhere, exactly as household_invites does it. That is what makes
-- "only an Owner accepts or removes" a database guarantee rather than a
-- convention the UI happens to follow.

-- 'removed' is not merely an ended follow. It is the block: the row survives so
-- that the next request from the same person fails and the Owner never sees it.
-- An unfollow DELETES its row instead, which is what makes that one repeatable.
create type public.follow_status as enum ('pending', 'accepted', 'removed');

create table public.household_follows (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  follower_id uuid not null references public.users (id) on delete cascade,
  status public.follow_status not null default 'pending',
  requested_at timestamptz not null default now(),
  responded_at timestamptz,
  responded_by uuid references public.users (id) on delete set null
);

-- One relationship per person per household, enforced rather than assumed. This
-- is also what makes 'removed' a durable block: there is nowhere for a second
-- row to go.
create unique index household_follows_one_per_person
  on public.household_follows (household_id, follower_id);

-- The follower's own Posts scope: "every household I follow".
create index household_follows_follower_idx
  on public.household_follows (follower_id)
  where status = 'accepted';

-- The Owner's two lists, and the badge count.
create index household_follows_household_status_idx
  on public.household_follows (household_id, status);

alter table public.household_follows enable row level security;

-- SELECT only. An Owner sees their household's rows; a follower sees their own,
-- including a pending one -- they have to be told they are waiting.
create policy "Owners see their household's follows, followers see their own"
  on public.household_follows
  for select
  to authenticated
  using (
    private.is_household_owner(household_id)
    or follower_id = auth.uid()
  );

grant select on public.household_follows to authenticated;

create or replace function private.is_household_follower(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_follows
    where household_follows.household_id = target_household_id
      and household_follows.follower_id = auth.uid()
      and household_follows.status = 'accepted'
  );
$$;

-- The read boundary, in one place. Every policy that widens for a Follower
-- calls this rather than restating the union, so the boundary can only be moved
-- deliberately and in one edit.
create or replace function private.can_read_household(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_household_member(target_household_id)
      or private.is_household_follower(target_household_id);
$$;

create or replace function private.can_read_post(target_post_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.posts
    where posts.id = target_post_id
      and private.can_read_household(posts.household_id)
  );
$$;

create or replace function private.can_read_pet(target_pet_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.pets
    where pets.id = target_pet_id
      and private.can_read_household(pets.household_id)
  );
$$;

create or replace function private.can_read_comment(target_comment_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.post_comments c
    where c.id = target_comment_id
      and private.can_read_post(c.post_id)
  );
$$;

-- Asking to follow.
--
-- Returns 'blocked' for a removed row and 'requested' for a fresh one, and the
-- two are indistinguishable to the caller by design -- a removed person learns
-- their request went nowhere, not that they were removed.
create or replace function public.request_follow(target_household_id uuid)
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

  return jsonb_build_object('status', 'pending', 'id', existing.id);
end $$;

revoke execute on function public.request_follow(uuid) from public, anon;
grant execute on function public.request_follow(uuid) to authenticated;

-- Accepting or declining. Owner only, which is the same gate an Invite uses.
--
-- A decline DELETES the row rather than recording a state. Declining is not
-- removing: it refuses this request, and the person may ask again.
create or replace function public.respond_to_follow_request(
  follow_id uuid,
  accept boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.household_follows;
begin
  select * into target from public.household_follows where id = follow_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if not private.is_household_owner(target.household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  if target.status <> 'pending' then
    return jsonb_build_object('status', 'not_pending');
  end if;

  if accept then
    update public.household_follows
    set status = 'accepted',
        responded_at = now(),
        responded_by = auth.uid()
    where id = follow_id;

    return jsonb_build_object('status', 'accepted');
  end if;

  delete from public.household_follows where id = follow_id;

  return jsonb_build_object('status', 'declined');
end $$;

revoke execute on function public.respond_to_follow_request(uuid, boolean) from public, anon;
grant execute on function public.respond_to_follow_request(uuid, boolean) to authenticated;

-- Removing a Follower. Owner only, and it blocks.
--
-- Their Likes and Comments are deliberately left alone: a Comment is half of a
-- thread that Members replied to, and removal governs future access rather than
-- erasing the past. One Comment can still be deleted on its own, by the Post's
-- author or an Owner, under the policy that already exists.
create or replace function public.remove_follower(follow_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.household_follows;
begin
  select * into target from public.household_follows where id = follow_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if not private.is_household_owner(target.household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  update public.household_follows
  set status = 'removed',
      responded_at = now(),
      responded_by = auth.uid()
  where id = follow_id;

  return jsonb_build_object('status', 'removed');
end $$;

revoke execute on function public.remove_follower(uuid) from public, anon;
grant execute on function public.remove_follower(uuid) to authenticated;

-- Unfollowing, by the follower. Deletes the row, so it can be done again.
create or replace function public.unfollow_household(target_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.household_follows
  where household_id = target_household_id
    and follower_id = auth.uid()
    and status in ('pending', 'accepted');

  if not found then
    return jsonb_build_object('status', 'not_following');
  end if;

  return jsonb_build_object('status', 'unfollowed');
end $$;

revoke execute on function public.unfollow_household(uuid) from public, anon;
grant execute on function public.unfollow_household(uuid) to authenticated;

-- One relationship per household, kept true from the other direction too.
--
-- The unique index stops a second follow. Nothing stops a follower being made a
-- member, and that is the live path: someone follows a household, is then
-- invited into it, and would otherwise hold both at once. The membership wins
-- and the follow goes.
create or replace function private.drop_follow_on_join()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.household_follows
  where household_id = new.household_id
    and follower_id = new.user_id;

  return new;
end $$;

create trigger household_members_drop_follow
after insert on public.household_members
for each row
execute function private.drop_follow_on_join();
