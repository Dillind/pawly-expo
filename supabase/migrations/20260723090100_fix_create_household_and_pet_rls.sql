-- Fix create_household_and_pet(): the households insert used
-- `returning id into new_household_id`, but INSERT ... RETURNING implicitly
-- requires the new row to also satisfy the table's SELECT policy (RETURNING
-- reads the row back), not just the INSERT WITH CHECK. households' only
-- SELECT policy is private.is_household_member(id), which can never be true
-- for a household inserted this same statement -- the household_members row
-- that would make it true is only inserted by the *next* statement in this
-- function. So the original insert failed RLS (42501) for every caller,
-- always -- not an edge case, onboarding could never succeed as first
-- written.
--
-- Fix: generate the id in PL/pgSQL and insert it explicitly, dropping
-- RETURNING entirely -- no implicit read-back, no RLS SELECT check to fail.
-- security invoker is deliberately left untouched; this isn't an RLS policy
-- change, just avoiding the RETURNING gotcha (see auth foundation migration
-- and Task 2 of the onboarding plan for why this function must stay
-- security invoker, subject to RLS at every step).

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

  new_household_id := gen_random_uuid();

  insert into public.households (id, name, timezone)
  values (new_household_id, coalesce(owner_first_name, 'My') || '''s Household', household_timezone);

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
