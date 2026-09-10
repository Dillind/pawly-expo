-- The read boundary of ADR 0036, applied.
--
-- Every policy below moves from a membership test to private.can_read_household
-- or one of its per-row wrappers. Nothing else changes: the write policies, and
-- every policy on feed_times, feed_logs, reminders, pet_pauses and care_cards,
-- keep their membership test and are not touched by this file. That is the
-- boundary -- posts and pet profiles widen, the household's working life does
-- not.
--
-- ADR 0036 named four tables. It undercounted: post_pets carries the Pet Tag
-- chips on a card, comment_likes carries the count on a Comment, and a Pet
-- Profile needs pets, pet_photos, households and users. Ten policies, one
-- predicate.
--
-- The delete policy on post_comments is deliberately absent from this file. It
-- already reads `author_id = auth.uid() or private.can_manage_post(post_id)`,
-- and neither branch mentions membership, so a Post's author and an Owner can
-- moderate a Follower's Comment from the day it becomes possible to write one.

drop policy "Members can view their household's posts" on public.posts;
create policy "Members and followers can view a household's posts"
on public.posts for select
using ( private.can_read_household(household_id) );

drop policy "Members can view post photos" on public.post_photos;
create policy "Members and followers can view post photos"
on public.post_photos for select
using ( private.can_read_post(post_id) );

drop policy "Members can view post pet tags" on public.post_pets;
create policy "Members and followers can view post pet tags"
on public.post_pets for select
using ( private.can_read_post(post_id) );

drop policy "Members can view likes" on public.post_likes;
create policy "Members and followers can view likes"
on public.post_likes for select
using ( private.can_read_post(post_id) );

drop policy "Members can like as themselves" on public.post_likes;
create policy "Members and followers can like as themselves"
on public.post_likes for insert
with check (
  private.can_read_post(post_id)
  and user_id = auth.uid()
);

drop policy "Members can view comments on their household's posts" on public.post_comments;
create policy "Members and followers can view comments"
on public.post_comments for select
using ( private.can_read_post(post_id) );

drop policy "Members can comment as themselves" on public.post_comments;
create policy "Members and followers can comment as themselves"
on public.post_comments for insert
with check (
  private.can_read_post(post_id)
  and author_id = auth.uid()
);

drop policy "Members can view comment likes" on public.comment_likes;
create policy "Members and followers can view comment likes"
on public.comment_likes for select
using ( private.can_read_comment(comment_id) );

drop policy "Members can like a comment as themselves" on public.comment_likes;
create policy "Members and followers can like a comment as themselves"
on public.comment_likes for insert
with check (
  private.can_read_comment(comment_id)
  and user_id = auth.uid()
);

-- A Pet Profile is name, photo, breed, bio and gallery. Those live on `pets`
-- and `pet_photos`; nothing on either table describes care.
drop policy "Members can view pets in their household" on public.pets;
create policy "Members and followers can view a household's pets"
on public.pets for select
using ( private.can_read_household(household_id) );

drop policy "Members can view pet photos" on public.pet_photos;
create policy "Members and followers can view pet photos"
on public.pet_photos for select
using ( private.can_read_pet(pet_id) );

-- The name on the Post header and on the profile the follow link lands on.
-- `households` also carries timezone and grace_window_minutes, which a Follower
-- can now read. Neither is care data and neither renders anywhere for them --
-- narrowing to named columns would mean a view, and a view is a second object
-- to keep in step with a table that is still growing.
drop policy "Members can view their households" on public.households;
create policy "Members and followers can view a household"
on public.households for select
using ( private.can_read_household(id) );

-- Who wrote the Post, and who commented. Without this a Follower reads a feed
-- of posts by nobody.
--
-- It runs the other way too, which is the half that is easy to miss: an Owner
-- has to see the name and username of a person who has asked to follow them,
-- and that person is in none of their households.
--
-- Both directions live in a definer function rather than in the policy body. A
-- policy expression runs as the querying user, so a join to household_members
-- written inline is filtered by that table's OWN policy -- and a Follower is
-- not a member of it, so the join returns nothing and every Post renders
-- authorless.
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
  );
$$;

create policy "Followers and the households they follow can see each other"
on public.users for select
using ( private.can_see_user(id) );
