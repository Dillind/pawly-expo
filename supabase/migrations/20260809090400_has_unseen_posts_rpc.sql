-- The tab dot, as one round trip instead of two.
--
-- The first cut read posts_last_seen_at and the newest post as separate
-- queries and compared them in TypeScript. That is two requests a minute, per
-- member, to answer a yes/no -- and the comparison it was doing is a `where`
-- clause. `exists` also stops at the first qualifying row rather than ordering
-- the whole set to take one.
--
-- security INVOKER, unlike the trigger functions here. It reads posts and
-- household_members, both of which already have policies saying exactly who may
-- see what, so running as the caller means this function cannot leak a household
-- the caller is not in -- and there is no grant to get wrong.
--
-- '-infinity' rather than a null guard: a member who has never opened the tab
-- should see the dot if anything exists at all, and coalescing to the lowest
-- possible timestamp says that in the comparison rather than in a branch.

create or replace function public.has_unseen_posts(target_household_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.posts
    where posts.household_id = target_household_id
      and posts.occurred_at > coalesce(
        (
          select household_members.posts_last_seen_at
          from public.household_members
          where household_members.household_id = target_household_id
            and household_members.user_id = auth.uid()
        ),
        '-infinity'::timestamptz
      )
  );
$$;

revoke all on function public.has_unseen_posts(uuid) from public, anon;
grant execute on function public.has_unseen_posts(uuid) to authenticated;
