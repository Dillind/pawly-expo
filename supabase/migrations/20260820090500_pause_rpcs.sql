-- Pausing is versioned for the same reason a feed time is. Deleting the pause
-- row on resume would make days that expected nothing start expecting feeds
-- again, which is the history rewrite ADR 0030 exists to prevent.
--
-- A pause that never covered a day is deleted outright. There is no history to
-- protect, and leaving an empty range behind would block the next pause through
-- the exclusion constraint.

create function public.pause_pet(target_pet_id uuid, target_reason text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  today date;
  new_pause_id uuid;
begin
  select (now() at time zone households.timezone)::date into today
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if today is null then
    raise exception 'Pet not found' using errcode = '42501';
  end if;

  insert into public.pet_pauses (pet_id, during, reason)
  values (target_pet_id, daterange(today, null, '[)'), nullif(btrim(target_reason), ''))
  returning id into new_pause_id;

  return new_pause_id;
end;
$$;

create function public.resume_pet(target_pet_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  today date;
begin
  select (now() at time zone households.timezone)::date into today
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if today is null then
    raise exception 'Pet not found' using errcode = '42501';
  end if;

  -- Feeds resume today, so the pause covered up to yesterday.
  update public.pet_pauses
  set during = daterange(lower(pet_pauses.during), today, '[)')
  where pet_pauses.pet_id = target_pet_id
    and pet_pauses.during @> today
    and lower(pet_pauses.during) < today;

  delete from public.pet_pauses
  where pet_pauses.pet_id = target_pet_id
    and lower(pet_pauses.during) >= today;
end;
$$;

revoke execute on function public.pause_pet(uuid, text) from public, anon;
grant execute on function public.pause_pet(uuid, text) to authenticated;

revoke execute on function public.resume_pet(uuid) from public, anon;
grant execute on function public.resume_pet(uuid) to authenticated;
