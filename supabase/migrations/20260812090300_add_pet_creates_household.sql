-- One path for adding a pet, whether or not the user has a household yet.
--
-- Two problems are fixed together.
--
-- 1. add_pet picked the household with `limit 1` and NO `order by`, the same
--    defect that made a member of two households see an arbitrary one. Adding
--    a pet while looking at household B could file it under household A. The
--    household is now passed in explicitly -- the caller knows which one is
--    active, and the function should not guess.
--
-- 2. It raised 'No household for this user' when there was none, which is why
--    onboarding had to be a locked corridor that created one first. Passing
--    null now means "I have no household", and one is created with the caller
--    as its owner. That is what lets onboarding become an empty state instead
--    of a gate, and it retires create_household_and_pet.
--
-- security invoker is kept deliberately: pets and feeding_schedules carry
-- "Owners can create" policies, so a contributor calling this is refused by RLS
-- with no code here to get wrong.

drop function if exists public.add_pet(
  text, text, public.pet_sex, date, boolean, text, jsonb
);

create or replace function public.add_pet(
  pet_name text,
  pet_breed text,
  pet_sex public.pet_sex,
  pet_birthdate date,
  pet_birthdate_is_approximate boolean,
  pet_photo_url text,
  feeding_times jsonb,
  target_household_id uuid default null,
  household_timezone text default 'Australia/Melbourne'
)
returns public.pets
language plpgsql
security invoker
set search_path = ''
as $$
declare
  household_id_to_use uuid := target_household_id;
  new_pet public.pets;
  owner_first_name text;
  feeding_time jsonb;
begin
  if household_id_to_use is null then
    select first_name into owner_first_name from public.users where id = auth.uid();

    -- The id is generated here rather than read back with `returning`: the
    -- households SELECT policy is membership-scoped and the caller is not a
    -- member yet, so the implicit read-back would be refused.
    household_id_to_use := gen_random_uuid();

    insert into public.households (id, name, timezone)
    values (
      household_id_to_use,
      left(coalesce(owner_first_name, 'My') || '''s Household', 30),
      household_timezone
    );

    -- Explicit rather than relying on the column default: this is the one
    -- caller that knows it is inserting an owner, and Feed Logged Alerts
    -- default on for owners per the delivery rule in ADR 0012.
    insert into public.household_members (household_id, user_id, role, feed_logged_alerts)
    values (household_id_to_use, auth.uid(), 'owner', true);

  elsif not exists (
    select 1 from public.household_members
    where household_id = household_id_to_use and user_id = auth.uid()
  ) then
    raise exception 'Not a member of that household';
  end if;

  insert into public.pets (
    household_id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url
  )
  values (
    household_id_to_use, pet_name, pet_breed, pet_sex, pet_birthdate,
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
  text, text, public.pet_sex, date, boolean, text, jsonb, uuid, text
) from public, anon;

grant execute on function public.add_pet(
  text, text, public.pet_sex, date, boolean, text, jsonb, uuid, text
) to authenticated;

-- Superseded: add_pet with a null household does the same job, and one path
-- means one place where the founding owner and the household name are decided.
drop function if exists public.create_household_and_pet(
  text, text, text, public.pet_sex, date, boolean, text, jsonb
);
