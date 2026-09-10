-- can_see_user granted two directions and needed four.
--
-- The original pair was Owner -> requester (so an Owner can read the name on a
-- request) and follower -> members (so a Post has an author). Both are about
-- reading the OTHER side of the relationship, and both stop at the Owner.
--
-- The missing pair is a Follower being read. `followers_can_read_posts_and_pets`
-- widened post_comments and post_likes to can_read_post, so a Follower now
-- writes into a household's threads -- and COMMENT_SELECT and POST_SELECT both
-- embed `users`. A Contributor reading that thread matched no branch, so the
-- comment they were meant to reply to arrived with a null author: no name, no
-- avatar. Two Followers of the same household could not see each other either.
--
-- This is not a profile surface. ADR 0036 gives a Follower no screen of their
-- own, and nothing here makes one reachable -- no route takes a user id.
-- It only lets a name render beside words that person wrote in the open.
--
-- A removed Follower stays visible on purpose. Their Comments survive removal
-- (the household replied to them), and hiding the row would leave those
-- authorless -- the same failure this migration exists to fix. The block works
-- through household_follows, whose two lists filter on status, so the Owner
-- still never sees a removed person in Followers or in Requests.
create or replace function private.can_see_user(target_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    -- Someone who has asked to follow a household I own.
    select 1
    from public.household_follows f
    join public.household_members m
      on m.household_id = f.household_id
     and m.user_id = auth.uid()
     and m.role = 'owner'
    where f.follower_id = target_user_id
  )
  or exists (
    -- A member of a household I follow.
    select 1
    from public.household_follows f
    join public.household_members m on m.household_id = f.household_id
    where f.follower_id = auth.uid()
      and f.status = 'accepted'
      and m.user_id = target_user_id
  )
  or exists (
    -- A follower of a household I am in, whatever my role.
    select 1
    from public.household_follows f
    join public.household_members m
      on m.household_id = f.household_id
     and m.user_id = auth.uid()
    where f.follower_id = target_user_id
      and f.status = 'accepted'
  )
  or exists (
    -- A follower of a household I follow too.
    select 1
    from public.household_follows mine
    join public.household_follows theirs
      on theirs.household_id = mine.household_id
    where mine.follower_id = auth.uid()
      and mine.status = 'accepted'
      and theirs.follower_id = target_user_id
      and theirs.status = 'accepted'
  );
$$;
