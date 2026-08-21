-- Phase 4 of CRU-066, first half. Additive only -- the drops live in the
-- migration after this one, so they can be applied separately.

-- Editing a feed time closes one version and opens a successor. The date
-- arithmetic stays in Postgres: "tomorrow" is a local date in the household's
-- timezone, and ADR 0009 keeps that reasoning out of TypeScript.
--
-- A successor starts tomorrow, never today. Today has already been read,
-- nudged about, and possibly logged -- rewriting it is exactly what versioning
-- exists to prevent.

create function public.save_feed_time(
  target_pet_id uuid,
  target_label public.feeding_schedule_label,
  target_local_time time,
  target_days_of_week smallint[] default '{0,1,2,3,4,5,6}',
  target_instructions text default null,
  target_series_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  tomorrow date;
  new_series_id uuid := coalesce(target_series_id, gen_random_uuid());
begin
  select ((now() at time zone households.timezone)::date + 1) into tomorrow
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if tomorrow is null then
    raise exception 'Pet not found' using errcode = '42501';
  end if;

  -- One live feed per label, as the old partial unique index on
  -- (pet_id, label) enforced. `custom` is exempt because repeating is its
  -- entire purpose. Raised as 23505 so the service keeps translating it into
  -- copy the form can show.
  if target_label <> 'custom' and exists (
    select 1
    from public.feed_times
    where feed_times.pet_id = target_pet_id
      and feed_times.label = target_label
      and feed_times.series_id <> new_series_id
      and upper(feed_times.effective) is null
  ) then
    raise exception 'A % feed already exists for this pet', target_label
      using errcode = '23505';
  end if;

  -- A version that starts tomorrow or later has applied to no day yet, so
  -- replacing it loses nothing and leaves no one-day fragment behind.
  delete from public.feed_times
  where feed_times.series_id = new_series_id
    and lower(feed_times.effective) >= tomorrow;

  update public.feed_times
  set effective = daterange(lower(feed_times.effective), tomorrow, '[)')
  where feed_times.series_id = new_series_id
    and feed_times.effective @> (tomorrow - 1);

  insert into public.feed_times
    (pet_id, series_id, label, local_time, days_of_week, instructions, effective)
  values (
    target_pet_id,
    new_series_id,
    target_label,
    target_local_time,
    target_days_of_week,
    nullif(btrim(target_instructions), ''),
    daterange(tomorrow, null, '[)')
  );

  return new_series_id;
end;
$$;

-- Removing a feed closes its range. Past days keep it, so their history stays
-- true. A version that never applied to a day is deleted outright -- there is
-- no history to protect.

create function public.end_feed_time(target_pet_id uuid, target_series_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  tomorrow date;
begin
  select ((now() at time zone households.timezone)::date + 1) into tomorrow
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if tomorrow is null then
    raise exception 'Pet not found' using errcode = '42501';
  end if;

  delete from public.feed_times
  where feed_times.series_id = target_series_id
    and feed_times.pet_id = target_pet_id
    and lower(feed_times.effective) >= tomorrow;

  update public.feed_times
  set effective = daterange(lower(feed_times.effective), tomorrow, '[)')
  where feed_times.series_id = target_series_id
    and feed_times.pet_id = target_pet_id
    and feed_times.effective @> (tomorrow - 1);
end;
$$;

revoke execute on function public.save_feed_time(uuid, public.feeding_schedule_label, time, smallint[], text, uuid) from public, anon;
grant execute on function public.save_feed_time(uuid, public.feeding_schedule_label, time, smallint[], text, uuid) to authenticated;

revoke execute on function public.end_feed_time(uuid, uuid) from public, anon;
grant execute on function public.end_feed_time(uuid, uuid) to authenticated;

-- add_pet writes feed_times. pet_pet_type is last and defaulted so the
-- existing client call keeps working until the UI offers the choice.

create or replace function public.add_pet(
  pet_name text,
  pet_breed text,
  pet_sex public.pet_sex,
  pet_birthdate date,
  pet_birthdate_is_approximate boolean,
  pet_photo_url text,
  feeding_times jsonb,
  target_household_id uuid default null,
  household_timezone text default 'Australia/Melbourne',
  pet_pet_type public.pet_type default 'dog'
)
returns public.pets
language plpgsql
set search_path = ''
as $$
declare
  household_id_to_use uuid := target_household_id;
  new_pet public.pets;
  owner_first_name text;
  feeding_time jsonb;
  tomorrow date;
begin
  if household_id_to_use is null then
    select first_name into owner_first_name from public.users where id = auth.uid();

    household_id_to_use := gen_random_uuid();

    insert into public.households (id, name, timezone)
    values (
      household_id_to_use,
      left(coalesce(owner_first_name, 'My') || '''s Household', 30),
      household_timezone
    );

    insert into public.household_members (household_id, user_id, role, feed_logged_alerts)
    values (household_id_to_use, auth.uid(), 'owner', true);

  elsif not exists (
    select 1 from public.household_members
    where household_id = household_id_to_use and user_id = auth.uid()
  ) then
    raise exception 'Not a member of that household';
  end if;

  insert into public.pets (
    household_id, name, breed, sex, birthdate, birthdate_is_approximate, photo_url, pet_type
  )
  values (
    household_id_to_use, pet_name, pet_breed, pet_sex, pet_birthdate,
    pet_birthdate_is_approximate, pet_photo_url, pet_pet_type
  )
  returning * into new_pet;

  select ((now() at time zone households.timezone)::date + 1) into tomorrow
  from public.households where households.id = household_id_to_use;

  for feeding_time in select * from jsonb_array_elements(feeding_times)
  loop
    insert into public.feed_times
      (pet_id, label, local_time, days_of_week, instructions, effective)
    values (
      new_pet.id,
      (feeding_time ->> 'label')::public.feeding_schedule_label,
      (feeding_time ->> 'scheduledTime')::time,
      coalesce(
        (select array_agg(value::smallint)
         from jsonb_array_elements_text(feeding_time -> 'daysOfWeek')),
        '{0,1,2,3,4,5,6}'::smallint[]
      ),
      nullif(btrim(feeding_time ->> 'instructions'), ''),
      daterange(tomorrow, null, '[)')
    );
  end loop;

  return new_pet;
end;
$$;

revoke execute on function public.add_pet(text, text, public.pet_sex, date, boolean, text, jsonb, uuid, text, public.pet_type) from public, anon;
grant execute on function public.add_pet(text, text, public.pet_sex, date, boolean, text, jsonb, uuid, text, public.pet_type) to authenticated;

-- The nine-argument signature would be ambiguous against the new one for a
-- nine-argument call.
drop function if exists public.add_pet(text, text, public.pet_sex, date, boolean, text, jsonb, uuid, text);
