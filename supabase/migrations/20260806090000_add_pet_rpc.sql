-- Adds a pet to the caller's household, together with its feeding schedule.
--
-- A pet without a Feeding Schedule has no slots on Home and cannot be detected
-- as a Missed Feed, so the two are created in one transaction the way
-- create_household_and_pet already does it.
--
-- security invoker is deliberate: pets and feeding_schedules both carry
-- "Owners can create" insert policies, so a Contributor calling this is refused
-- by RLS with no code here to get wrong. See the header of
-- 20260723090100_fix_create_household_and_pet_rls.sql for why that function is
-- invoker too.
--
-- `returning * into new_pet` is safe here, unlike in the households insert that
-- migration had to rewrite: the pets SELECT policy is is_household_member
-- (household_id), which is already true for the caller before this statement
-- runs, so the implicit read-back passes.

create or replace function public.add_pet(
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
  target_household_id uuid;
  new_pet public.pets;
  feeding_time jsonb;
begin
  select household_id into target_household_id
  from public.household_members
  where user_id = auth.uid()
  limit 1;

  if target_household_id is null then
    raise exception 'No household for this user';
  end if;

  insert into public.pets (
    household_id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url
  )
  values (
    target_household_id, pet_name, pet_breed, pet_sex, pet_birthdate,
    pet_birthdate_is_approximate, pet_photo_url
  )
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

revoke execute on function public.add_pet(
  text, text, public.pet_sex, date, boolean, text, jsonb
) from anon;

grant execute on function public.add_pet(
  text, text, public.pet_sex, date, boolean, text, jsonb
) to authenticated;
