-- An unfollow left a Comment authorless.
--
-- `20260910090000` widened can_see_user so a Follower's name renders beside
-- words they wrote, and its header says why: their Comments survive removal,
-- and hiding the user row would leave those Comments with no author. It fixed
-- the case where an Owner REMOVES a follower -- that row survives as 'removed',
-- so the third branch still matches.
--
-- An unfollow DELETES the row. So on the commonest path no branch matched, and
-- the exact failure that migration exists to prevent happened anyway: the
-- household saw "Removed member" against a comment they had replied to, and a
-- grey placeholder in the likers row. The person was never a member and was
-- never removed. Verified on a device on 2026-09-10.
--
-- The rule is ADR 0036's: a Follow governs FUTURE access, it does not erase the
-- past. So the two branches below key on the words themselves rather than on
-- the relationship -- if I can read the Post, I can read the name of whoever
-- wrote or liked it. Nothing new becomes readable: can_read_household is the
-- same boundary the Post itself already passed through.
--
-- This deliberately does not expire. A name beside a two-year-old comment is
-- the same fact as a name beside a new one, and a household that wanted the
-- person gone deletes the comment, which they can already do.
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
  )
  or exists (
    -- Whoever wrote a Comment I can read.
    select 1
    from public.post_comments c
    join public.posts p on p.id = c.post_id
    where c.author_id = target_user_id
      and private.can_read_household(p.household_id)
  )
  or exists (
    -- Whoever left a Like I can read.
    select 1
    from public.post_likes l
    join public.posts p on p.id = l.post_id
    where l.user_id = target_user_id
      and private.can_read_household(p.household_id)
  );
$$;

-- The two new branches filter by the author, and neither column was indexed:
-- post_comments carried only (post_id, created_at) and (parent_id), and
-- post_likes only (post_id). Without these, naming one person on one Post card
-- is a sequential scan of every comment and every like in the database.
create index if not exists post_comments_author_idx
  on public.post_comments (author_id);

create index if not exists post_likes_user_idx
  on public.post_likes (user_id);
