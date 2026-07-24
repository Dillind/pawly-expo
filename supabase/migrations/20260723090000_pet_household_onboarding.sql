-- Pets

create type public.pet_sex as enum ('male', 'female');

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  breed text,
  sex public.pet_sex,
  birthdate date,
  birthdate_is_approximate boolean not null default false,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.pets enable row level security;

create policy "Members can view pets in their household"
on public.pets for select
using ( private.is_household_member(household_id) );

create policy "Owners can create pets"
on public.pets for insert
with check ( private.is_household_owner(household_id) );

create policy "Owners can update pets"
on public.pets for update
using ( private.is_household_owner(household_id) )
with check ( private.is_household_owner(household_id) );

create policy "Owners can delete pets"
on public.pets for delete
using ( private.is_household_owner(household_id) );

-- Feeding schedules

create type public.feeding_schedule_label as enum ('morning', 'lunch', 'dinner', 'custom');

create table public.feeding_schedules (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  scheduled_time time not null,
  label public.feeding_schedule_label not null,
  created_at timestamptz not null default now()
);

alter table public.feeding_schedules enable row level security;

-- feeding_schedules has no household_id of its own, only pet_id -- these
-- helpers join through pets to reuse the household_members check, same
-- private-schema pattern as is_household_member/is_household_owner (see the
-- auth foundation migration for why these live in `private`, not `public`).

create or replace function private.is_pet_household_member(target_pet_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.pets
    join public.household_members on household_members.household_id = pets.household_id
    where pets.id = target_pet_id
      and household_members.user_id = auth.uid()
  );
$$;

create or replace function private.is_pet_household_owner(target_pet_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.pets
    join public.household_members on household_members.household_id = pets.household_id
    where pets.id = target_pet_id
      and household_members.user_id = auth.uid()
      and household_members.role = 'owner'
  );
$$;

create policy "Members can view feeding schedules for their household's pets"
on public.feeding_schedules for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can create feeding schedules"
on public.feeding_schedules for insert
with check ( private.is_pet_household_owner(pet_id) );

create policy "Owners can update feeding schedules"
on public.feeding_schedules for update
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

create policy "Owners can delete feeding schedules"
on public.feeding_schedules for delete
using ( private.is_pet_household_owner(pet_id) );

-- Households/household_members: the auth foundation migration deliberately
-- left these tables with no INSERT policies at all (nothing could create a
-- household yet). Add them now -- see ADR 0007 for why creation is scoped to
-- "become the founding owner of a brand new household" and nothing broader
-- (this must NOT allow a user to self-insert into an EXISTING household --
-- that requires invite redemption, not built yet).

-- Deliberately unrestricted (with check (true)) -- the real gate is the
-- founding-owner-only insert policy on household_members below. An
-- unowned household row on its own is inert (no RLS policy anywhere lets a
-- non-member read or act on it), so this is accepted as-is; it will keep
-- showing as a WARN in security advisors, which is expected.
create policy "Authenticated users can create a household"
on public.households for insert
to authenticated
with check ( true );

create policy "Users can become the founding owner of a new household"
on public.household_members for insert
to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and not exists (
    select 1 from public.household_members existing
    where existing.household_id = household_members.household_id
  )
);

-- Storage: pet photos. Public bucket -- photos aren't sensitive the way user
-- data is, and this avoids managing signed-URL expiry just to display an
-- <Image>. Uploads are still restricted by RLS, scoped to the uploader's own
-- auth.uid() in the object path.

-- No SELECT policy on storage.objects for this bucket, deliberately -- a
-- public bucket serves getPublicUrl() downloads through a separate public
-- endpoint that bypasses storage.objects RLS entirely, so a SELECT policy
-- here isn't needed for photo display and would only grant bucket-listing
-- (enumerating every uploaded file), which is a real exposure with no
-- upside. See Supabase's Storage Access Control guide.

insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true);

create policy "Users can upload their own pet photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

-- Atomic onboarding submission. security invoker (not definer) -- runs as
-- the calling user, subject to every RLS policy above at every step. If any
-- insert is rejected by RLS, the whole transaction rolls back: no orphaned
-- household, no pet with a missing feeding schedule (see ADR 0007).

create or replace function public.create_household_and_pet(
  household_timezone text,
  pet_name text,
  pet_breed text,
  pet_sex public.pet_sex,
  pet_birthdate date,
  pet_birthdate_is_approximate boolean,
  pet_photo_url text,
  feeding_times jsonb
)
returns public.pets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_household_id uuid;
  new_pet public.pets;
  owner_first_name text;
  feeding_time jsonb;
begin
  select first_name into owner_first_name from public.users where id = auth.uid();

  insert into public.households (name, timezone)
  values (coalesce(owner_first_name, 'My') || '''s Household', household_timezone)
  returning id into new_household_id;

  insert into public.household_members (household_id, user_id, role)
  values (new_household_id, auth.uid(), 'owner');

  insert into public.pets (household_id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url)
  values (new_household_id, pet_name, pet_breed, pet_sex, pet_birthdate, pet_birthdate_is_approximate, pet_photo_url)
  returning * into new_pet;

  for feeding_time in select * from jsonb_array_elements(feeding_times)
  loop
    insert into public.feeding_schedules (pet_id, scheduled_time, label)
    values (
      new_pet.id,
      (feeding_time ->> 'scheduledTime')::time,
      (feeding_time ->> 'label')::public.feeding_schedule_label
    );
  end loop;

  return new_pet;
end;
$$;
