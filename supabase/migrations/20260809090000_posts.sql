-- Household Posts. See ADR 0017.
--
-- A Post is its own object, not an enriched Feed Log. It never satisfies a
-- Scheduled Time, never touches feed_logs, and log_feed is unchanged by any of
-- this. Feeding and sharing stay separable so a bug in one cannot reach the
-- other.
--
-- AUDIENCE IS THE HOUSEHOLD, PERMANENTLY. There is no visibility column and
-- there must not be one. Public sharing would need a follower graph, a block
-- list, a report queue and a moderation budget; a nullable enum buys none of
-- that and makes every policy below reason about a case that cannot occur.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- Nullable, on delete set null, mirroring feed_logs.logged_by: a member who
  -- leaves the household keeps their name on what they wrote. Losing
  -- membership loses ACCESS (the select policy), not authorship. Only a
  -- deleted account anonymises the card.
  author_id uuid references public.users (id) on delete set null,
  caption text check (char_length(caption) <= 280),
  -- The sort key, and what the card's relative time reads from -- not
  -- created_at. Backdating is bounded by the insert policy, so a service-role
  -- correction is still possible.
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index posts_household_occurred_idx
  on public.posts (household_id, occurred_at desc);

-- Photos live in a child table from day one even though v1 writes exactly one
-- row and renders a single square image. A carousel then costs a client change
-- and nothing else -- no migration, no backfill of a text column into rows.
create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index post_photos_post_id_idx on public.post_photos (post_id, sort_order);

-- Pet tags are SUBJECT, not scope. They say which pets are in the photo. They
-- never change who can see the Post, which is always the whole household.
-- Optional and multi-select: two dogs in one photo is the ordinary case, and a
-- Post about nothing in particular (the empty bowl, a vet note) has none.
create table public.post_pets (
  post_id uuid not null references public.posts (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  primary key (post_id, pet_id)
);

-- The composite primary key is what makes "one Like per member per Post" a
-- database guarantee rather than a UI convention.
create table public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create index post_likes_post_id_idx on public.post_likes (post_id);

-- Helpers live in `private` for the reason 20260722120100 gives: `public` is an
-- exposed schema, so a SECURITY DEFINER function there is callable by
-- authenticated at /rest/v1/rpc/<name>. These read posts, which itself has RLS
-- enabled, so they must be definer to avoid recursing through the policies
-- that call them.

create or replace function private.is_post_household_member(target_post_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.posts
    join public.household_members
      on household_members.household_id = posts.household_id
    where posts.id = target_post_id
      and household_members.user_id = auth.uid()
  );
$$;

-- Deliberately the same test as the posts delete policy: author, or an Owner of
-- the household. Child rows follow the parent -- there is no world in which you
-- may add a photo to a post you cannot delete.
create or replace function private.can_manage_post(target_post_id uuid)
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
      and (
        posts.author_id = auth.uid()
        or exists (
          select 1
          from public.household_members
          where household_members.household_id = posts.household_id
            and household_members.user_id = auth.uid()
            and household_members.role = 'owner'
        )
      )
  );
$$;

create or replace function private.is_pet_in_post_household(
  target_post_id uuid,
  target_pet_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.posts
    join public.pets on pets.household_id = posts.household_id
    where posts.id = target_post_id
      and pets.id = target_pet_id
  );
$$;

-- Membership is the whole audience model, so every policy below is one call to
-- the same helper.

alter table public.posts enable row level security;

create policy "Members can view their household's posts"
on public.posts for select
using ( private.is_household_member(household_id) );

-- Insert is deliberately narrow: you may only author as yourself, and only
-- within the backdating window. Seven days is the span in which "I forgot to
-- post the photo from the weekend" is a real sentence; beyond that the date
-- picker is being used to rewrite history rather than to be honest about it.
create policy "Members can write their own posts"
on public.posts for insert
with check (
  private.is_household_member(household_id)
  and author_id = auth.uid()
  and occurred_at <= now()
  and occurred_at >= now() - interval '7 days'
);

create policy "Authors and owners can delete posts"
on public.posts for delete
using (
  author_id = auth.uid()
  or private.is_household_owner(household_id)
);

-- No update policy, deliberately. There is no edit in v1 -- delete and repost.
-- Editing needs an edited_at and a marker on the card so that comments, when
-- they arrive, cannot be made nonsense by a later rewrite. That is worth
-- building once, with comments, rather than twice.

alter table public.post_photos enable row level security;

create policy "Members can view post photos"
on public.post_photos for select
using ( private.is_post_household_member(post_id) );

create policy "Authors and owners can write post photos"
on public.post_photos for all
using ( private.can_manage_post(post_id) )
with check ( private.can_manage_post(post_id) );

alter table public.post_pets enable row level security;

create policy "Members can view post pet tags"
on public.post_pets for select
using ( private.is_post_household_member(post_id) );

-- The pet must belong to the same household as the post. Without this a member
-- of two households could tag one household's pet onto the other's photo, and
-- the tag would then render a pet name to people who cannot see that pet.
create policy "Authors and owners can write post pet tags"
on public.post_pets for all
using ( private.can_manage_post(post_id) )
with check (
  private.can_manage_post(post_id)
  and private.is_pet_in_post_household(post_id, pet_id)
);

alter table public.post_likes enable row level security;

create policy "Members can view likes"
on public.post_likes for select
using ( private.is_post_household_member(post_id) );

create policy "Members can like as themselves"
on public.post_likes for insert
with check (
  private.is_post_household_member(post_id)
  and user_id = auth.uid()
);

create policy "Members can remove their own like"
on public.post_likes for delete
using ( user_id = auth.uid() );

revoke all on public.posts from anon, authenticated;
revoke all on public.post_photos from anon, authenticated;
revoke all on public.post_pets from anon, authenticated;
revoke all on public.post_likes from anon, authenticated;

grant select, insert, delete on public.posts to authenticated;
grant select, insert, delete on public.post_photos to authenticated;
grant select, insert, delete on public.post_pets to authenticated;
grant select, insert, delete on public.post_likes to authenticated;

-- No update grant on any of them: no edit, and a Like is a row that exists or
-- does not.
