-- The build-your-household flow writes nothing until its last step, so the
-- household, its owner, its first pet and that pet's feed times are one
-- transaction. add_pet with a null household stays for every other path; this
-- one exists because a Handle and a Listed switch have to be asked for, and
-- add_pet has nowhere to put them.
--
-- The handle is checked here rather than held: a reservation table buys a few
-- minutes of certainty and a new way to fail. Checked inside the transaction,
-- a lost race costs the user one retyped word.

create or replace function public.create_household_with_pet(
  household_name text,
  household_handle text,
  household_is_listed boolean,
  household_timezone text,
  pet_name text,
  pet_sex public.pet_sex,
  pet_birthdate date,
  pet_birthdate_is_approximate boolean,
  pet_photo_url text,
  feeding_times jsonb,
  pet_pet_type public.pet_type default 'dog',
  pet_breed_id uuid default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  new_household_id uuid;
  new_pet public.pets;
begin
  if not public.handle_available(household_handle) then
    return jsonb_build_object('status', 'handle_taken');
  end if;

  -- The id is generated here rather than read back with `returning`: the
  -- households SELECT policy is membership-scoped and the caller is not a
  -- member yet, so the implicit read-back would be refused.
  new_household_id := gen_random_uuid();

  insert into public.households (id, name, handle, is_listed, timezone)
  values (
    new_household_id, household_name, household_handle, household_is_listed, household_timezone
  );

  -- Explicit rather than relying on the column default: this is one of two
  -- callers that knows it is inserting an owner, and Feed Logged Alerts
  -- default on for owners per the delivery rule in ADR 0012.
  insert into public.household_members (household_id, user_id, role, feed_logged_alerts)
  values (new_household_id, auth.uid(), 'owner', true);

  select * into new_pet from public.add_pet(
    pet_name => pet_name,
    pet_breed => null,
    pet_sex => pet_sex,
    pet_birthdate => pet_birthdate,
    pet_birthdate_is_approximate => pet_birthdate_is_approximate,
    pet_photo_url => pet_photo_url,
    feeding_times => feeding_times,
    target_household_id => new_household_id,
    household_timezone => household_timezone,
    pet_pet_type => pet_pet_type,
    pet_breed_id => pet_breed_id
  );

  return jsonb_build_object(
    'status', 'created',
    'household_id', new_household_id,
    'pet_id', new_pet.id,
    'pet_name', new_pet.name
  );
exception
  -- The unique index on lower(handle) is the real gate: handle_available can
  -- still be beaten between the check and the insert.
  when unique_violation then
    return jsonb_build_object('status', 'handle_taken');
end;
$$;

revoke execute on function public.create_household_with_pet(
  text, text, boolean, text, text, public.pet_sex, date, boolean, text, jsonb,
  public.pet_type, uuid
) from public, anon;

grant execute on function public.create_household_with_pet(
  text, text, boolean, text, text, public.pet_sex, date, boolean, text, jsonb,
  public.pet_type, uuid
) to authenticated;
