-- Preferences live on the membership, not on users, because the preference is
-- genuinely a property of THIS PERSON IN THIS HOUSEHOLD: a dog walker with
-- four clients can mute Tuesday's household and keep her own dog's alerts. It
-- also sits on the exact row the send query already joins to find recipients.
--
-- The column DEFAULTS are the QUIET ones. That is deliberate, and it is not
-- the same thing as the role defaults. A column default is what every future
-- path inherits -- the invite-accept path that does not exist yet, a
-- hand-seeded test row, a backfill. A path someone forgets to update should be
-- silent (recoverable with a toggle the user already has) rather than noisy
-- (the failure PRODUCT_BRIEF names as fatal). The founding owner's `true` is
-- therefore stated explicitly below, by the one caller that knows the role.

alter table public.household_members
  add column feed_logged_alerts boolean not null default false,
  add column missed_feed_alerts boolean not null default true;

-- Existing members predate these columns and would otherwise sit at the quiet
-- default, making the first end-to-end verification silently deliver nothing.
update public.household_members set feed_logged_alerts = true where role = 'owner';

-- Recreated verbatim from the live definition, changing ONLY the
-- household_members insert. Everything else -- the signature, security
-- invoker, set search_path = '', the explicit gen_random_uuid() household id
-- introduced by 20260723090100 -- is unchanged.
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
set search_path = ''
as $function$
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

  -- Explicit rather than relying on the column default: this caller is the one
  -- place that knows it is inserting an owner, and Feed Logged Alerts default
  -- on for owners per the delivery rule in ADR 0012.
  insert into public.household_members (household_id, user_id, role, feed_logged_alerts)
  values (new_household_id, auth.uid(), 'owner', true);

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
$function$;
