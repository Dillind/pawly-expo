-- CRU-104, move 1 of 2: expand. Move 2 drops `breed` once no build reads it.
--
-- The filename timestamp is the version the remote recorded when this was
-- applied on 2026-09-02. They have to match or `supabase db push` replays it.

-- Added beside `breed`, never renamed from it. A rename has no safe order: the
-- shipped build reads `breed`, a build on main reads `breed_freetext`.
alter table public.pets add column breed_freetext text;

update public.pets set breed_freetext = breed where breed is not null;

alter table public.pets add column breed_id uuid references public.breeds(id);

-- Partial, because the FK needs an index only to keep a future delete of a
-- breed row from scanning.
create index pets_breed_id_idx on public.pets (breed_id) where breed_id is not null;

-- An unmatched pet keeps its string rather than being forced to "Unknown".
update public.pets p
set breed_id = b.id
from public.breeds b
where p.breed_freetext is not null
  and b.species::text = p.pet_type::text
  and lower(btrim(p.breed_freetext)) = lower(b.name);

-- Keeps the two text columns in step while both exist. A trigger rather than
-- dual-writing in add_pet, because PetService.update writes the table directly.
-- Move 2 drops this with the column.
create or replace function public.mirror_pet_breed_text()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.breed_freetext is null then
      new.breed_freetext := new.breed;
    elsif new.breed is null then
      new.breed := new.breed_freetext;
    end if;
  elsif new.breed is distinct from old.breed then
    new.breed_freetext := new.breed;
  elsif new.breed_freetext is distinct from old.breed_freetext then
    new.breed := new.breed_freetext;
  end if;

  return new;
end;
$$;

create trigger pets_mirror_breed_text
before insert or update of breed, breed_freetext on public.pets
for each row execute function public.mirror_pet_breed_text();

-- pet_breed_id is last and defaulted, so the signature is unchanged and the
-- existing grants still apply.
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
  pet_pet_type public.pet_type default 'dog',
  pet_breed_id uuid default null
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
    household_id, name, breed_freetext, breed_id, sex, birthdate,
    birthdate_is_approximate, photo_url, pet_type
  )
  values (
    household_id_to_use, pet_name, nullif(btrim(pet_breed), ''), pet_breed_id, pet_sex,
    pet_birthdate, pet_birthdate_is_approximate, pet_photo_url, pet_pet_type
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

revoke execute on function public.add_pet(
  text, text, public.pet_sex, date, boolean, text, jsonb, uuid, text, public.pet_type, uuid
) from public, anon;
grant execute on function public.add_pet(
  text, text, public.pet_sex, date, boolean, text, jsonb, uuid, text, public.pet_type, uuid
) to authenticated;
