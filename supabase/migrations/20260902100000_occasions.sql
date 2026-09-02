-- An Occasion: one household-owned kind on a Post. See ADR 0035.
--
-- It replaces the milestone toggle that was scoped as CRU-093. A boolean holds
-- exactly one idea and has nowhere to grow; a household that wants "Vet visit"
-- next to "Birthday" would need a second column, then a third.
--
-- The set belongs to the HOUSEHOLD, not to the member and not to the app. Two
-- members must not end up writing "Vet" and "vet visit" for the same thing.

create table public.occasions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- One grapheme in practice, but a flag or a family is several code points,
  -- so the cap is bytes-of-text rather than a promise about characters.
  emoji text check (char_length(emoji) <= 16),
  label text check (char_length(label) <= 24),
  sort_order integer not null default 0,
  -- Soft delete. A Post is a record of a day, so removing an Occasion from the
  -- picker must never rewrite what the Posts carrying it said.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  -- An emoji, a label, or both. Never neither -- an Occasion with neither is
  -- an empty pill, which is nothing at all.
  constraint occasions_carry_something check (
    coalesce(btrim(emoji), '') <> '' or coalesce(btrim(label), '') <> ''
  )
);

-- Partial: every read of the picker wants the live rows, and the deleted ones
-- are only ever reached by id through a Post that already carries one.
create index occasions_household_live_idx
  on public.occasions (household_id, sort_order)
  where deleted_at is null;

alter table public.posts
  -- `set null` rather than `restrict`: the app never hard-deletes an Occasion,
  -- so this fires only when a household is removed, and the Posts are going
  -- with it anyway. `restrict` would make that cascade order-dependent.
  add column occasion_id uuid references public.occasions (id) on delete set null;

create index posts_occasion_idx on public.posts (occasion_id)
  where occasion_id is not null;

-- The six a household starts with. All six are editable and all six can be
-- removed -- this is a starting vocabulary, not a fixed enum.
create or replace function private.seed_household_occasions(target_household_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.occasions (household_id, emoji, label, sort_order)
  values
    (target_household_id, '🎉', 'Milestone', 0),
    (target_household_id, '🏥', 'Vet visit', 1),
    (target_household_id, '🎂', 'Birthday', 2),
    (target_household_id, '🏡', 'Adoption day', 3),
    (target_household_id, '🎓', 'Training', 4),
    (target_household_id, '🛁', 'Bath', 5);
$$;

create or replace function private.seed_occasions_on_household_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_household_occasions(new.id);
  return new;
end $$;

create trigger seed_occasions_after_household_insert
  after insert on public.households
  for each row
  execute function private.seed_occasions_on_household_insert();

-- Every household that already exists gets the same six.
select private.seed_household_occasions(id) from public.households;

create or replace function private.is_occasion_in_household(
  target_occasion_id uuid,
  target_household_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.occasions
    where occasions.id = target_occasion_id
      and occasions.household_id = target_household_id
  );
$$;

alter table public.occasions enable row level security;

-- Soft-deleted rows are included on purpose. A Post that carries a removed
-- Occasion still has to render its chip, and filtering the picker is the
-- client's job, not the policy's.
create policy "Members can view their household's occasions"
on public.occasions for select
using ( private.is_household_member(household_id) );

-- Any Member, not Owners only. A household is people who share a pet, and the
-- alternative -- a Contributor who can tag a Post with an Occasion but cannot
-- add the one they need -- is a worse failure than a renamed pill. See ADR 0035.
create policy "Members can write their household's occasions"
on public.occasions for insert
with check ( private.is_household_member(household_id) );

create policy "Members can edit their household's occasions"
on public.occasions for update
using ( private.is_household_member(household_id) )
with check ( private.is_household_member(household_id) );

revoke all on public.occasions from anon, authenticated;

-- No delete grant, deliberately. The soft delete is not a convention the client
-- agrees to follow -- it is the only write the database offers.
grant select, insert on public.occasions to authenticated;
grant update (emoji, label, sort_order, deleted_at) on public.occasions to authenticated;

grant update (occasion_id) on public.posts to authenticated;
