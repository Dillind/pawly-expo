-- A Household gets a Handle and a Listed switch.
--
-- Listing changes whether strangers can FIND a Household. It never changes who
-- gets in -- an Owner accepts every Follow, always. That is why the word is
-- "Listed" and not "Public": public names a door, and this is a directory.

-- Nullable, and no backfill. A Household created before this migration has no
-- handle, and a null is the honest record of that. CRU-131's build-your-
-- household flow is what makes one required from now on; the column stays
-- nullable so the two facts do not have to be reconciled by a fake value.
alter table public.households
  add column handle text,
  add column is_listed boolean not null default false;

-- Hyphen, not underscore -- users.username used `[a-z0-9_]`, and this is
-- deliberately different rather than copied. Allowing both is how
-- @kathys-house and @kathys_house both get taken by different households.
--
-- The alternation is what forbids a trailing hyphen and a doubled one: every
-- hyphen sits between two alphanumerics. Length is checked separately because
-- the group repeat cannot express it.
alter table public.households
  add constraint households_handle_format
  check (handle is null or (
    handle ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
    and length(handle) between 3 and 20
  ));

-- Ported from users_username_not_reserved rather than invented. Kept in the
-- constraint for the same reason: a handful of words that change about once a
-- year, and a table would need its own RLS for no benefit.
alter table public.households
  add constraint households_handle_not_reserved
  check (handle is null or handle not in ('admin', 'crumpet', 'support', 'owner', 'help'));

-- The search row's job is to tell two households named "The Smiths" apart, and
-- the handle is the only field that does it. Enforced here rather than in the
-- client, which is not where a data rule belongs.
alter table public.households
  add constraint households_listed_needs_handle
  check (not is_listed or handle is not null);

-- lower(), matching users_username_unique. The format constraint already
-- forbids uppercase, but it is the index that decides whether two handles
-- collide and it should not depend on that constraint staying as it is.
create unique index households_handle_unique on public.households (lower(handle));

-- Column-level, so a write to a column absent from this list reports success
-- and is gone on the next refetch, with no error to catch. Settings write by
-- direct table update, so handle and is_listed have to join it here.
grant update (name, timezone, grace_window_minutes, handle, is_listed)
  on public.households to authenticated;

-- The unique index is the real guard. This exists so the answer arrives before
-- the Owner taps Save. It answers "free to take", so a reserved word is not
-- available; format is the client's Zod schema to enforce, and an invalid
-- string is reported unavailable rather than accepted.
--
-- It deliberately does NOT filter on is_listed, and must not be changed to.
-- The handle namespace is global, so "is this free" has one true answer and an
-- unlisted Household occupies its handle exactly as a Listed one does. Filter
-- here and the function tells an Owner a taken handle is free, they save, and
-- the unique index refuses the write with an error the screen cannot explain.
--
-- The information this reveals is the minimum a unique namespace must reveal:
-- that some Household holds a given string. It names no Household, and there is
-- no path from a handle to a Household except search, which is the thing
-- is_listed governs. Removing the check would not close that either -- the
-- unique violation on save answers the same question, one guess at a time.
create function public.handle_available(candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    candidate is not null
    and candidate ~ '^[a-z][a-z0-9]*(-[a-z0-9]+)*$'
    and length(candidate) between 3 and 20
    and candidate not in ('admin', 'crumpet', 'support', 'owner', 'help')
    and not exists (
      select 1 from public.households where lower(households.handle) = lower(candidate)
    );
$$;

-- authenticated only. username_available was granted to anon for a signed-out
-- signup form; a handle is only ever set from inside Household settings, and an
-- anon grant would let anybody enumerate handles without an account.
revoke execute on function public.handle_available(text) from public, anon;
grant execute on function public.handle_available(text) to authenticated;

-- Suggestions from the Household name.
--
-- Apostrophes are DELETED, and only then does each remaining run of characters
-- outside a-z0-9 become one hyphen. The order is the whole point: collapsing
-- first turns "Kathy's House" into `kathy-s-house`, which is a word broken in
-- half. Deleting first gives `kathys-house`, which is the name.
--
-- Hyphens are then trimmed from both ends, and anything before the first letter
-- is dropped, because a handle has to start with one -- so "123 House" offers
-- `house` rather than nothing at all.
--
-- 18, so the longest suffix (`30`) still fits 20 characters. A stem with fewer
-- than two usable characters gets nothing rather than a `member1` shaped
-- fallback.
create function public.handle_suggestions(stem text, wanted int default 3)
returns setof text
language sql
security definer
set search_path = ''
stable
as $$
  with root as (
    select left(cleaned, 18) as value
    from (
      select regexp_replace(
        trim(both '-' from
          regexp_replace(
            -- The apostrophe goes first, so the word it sits inside survives
            -- whole. Both the typographic one and the typed one.
            regexp_replace(lower(coalesce(stem, '')), '[''’]', '', 'g'),
            '[^a-z0-9]+', '-', 'g'
          )
        ),
        '^[^a-z]+', ''
      ) as cleaned
    ) collapsed
    where length(cleaned) >= 2
  ),
  candidates as (
    select n, root.value || n::text as candidate
    from root, generate_series(1, 30) as n
  )
  -- The bare stem first when it is free, then the numbered ones.
  select candidate
  from (
    select 0 as n, root.value as candidate from root
    union all
    select n, candidate from candidates
  ) all_candidates
  where public.handle_available(candidate)
  order by n
  limit least(greatest(coalesce(wanted, 3), 0), 30);
$$;

revoke execute on function public.handle_suggestions(text, int) from public, anon;
grant execute on function public.handle_suggestions(text, int) to authenticated;

-- follow_preview gains the handle.
--
-- A search result opens this screen, so without it the landing screen shows no
-- @. It does NOT gain is_listed: whoever is on this screen already reached it,
-- so the flag tells them nothing and leaks a setting.
create or replace function public.follow_preview(target_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  household public.households;
  relationship text;
  pet_rows jsonb;
begin
  select * into household from public.households where id = target_household_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if private.is_household_member(target_household_id) then
    relationship := 'member';
  else
    select case when f.status = 'accepted' then 'accepted'
                when f.status = 'pending' then 'pending'
                else 'none' end
      into relationship
    from public.household_follows f
    where f.household_id = target_household_id
      and f.follower_id = auth.uid();

    relationship := coalesce(relationship, 'none');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'name', p.name, 'breed', p.breed, 'photo_url', p.photo_url
         ) order by p.name), '[]'::jsonb)
    into pet_rows
  from public.pets p
  where p.household_id = target_household_id;

  return jsonb_build_object(
    'status', relationship,
    'household_id', household.id,
    'name', household.name,
    'handle', household.handle,
    'pets', pet_rows
  );
end $$;

revoke execute on function public.follow_preview(uuid) from public, anon;
grant execute on function public.follow_preview(uuid) to authenticated;
