-- Three holes a review found in the first cut of `delete_household`.
--
-- 1. `btrim(null) <> household_name` is NULL, and `if NULL then` is false, so a
--    caller passing a null name fell straight through the gate to the delete.
-- 2. Only the typed name was trimmed. A stored name with surrounding space --
--    which the table permits -- passed on the screen and failed here, leaving
--    a Household nobody could delete.
-- 3. Ownership was read once, then the delete ran. A second Owner demoting the
--    caller in between left the delete running on an ex-Owner's authority.
--
-- The row lock is what closes the third: a concurrent set_member_role waits,
-- and the ownership re-read after it sees the settled answer.

create or replace function public.delete_household(
  target_household_id uuid,
  confirmed_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  household_name text;
begin
  if confirmed_name is null then
    return jsonb_build_object('status', 'name_mismatch');
  end if;

  if not private.is_household_owner(target_household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  select name into household_name
  from public.households
  where id = target_household_id
  for update;

  if household_name is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- Re-read behind the lock: the check above was taken before it.
  if not private.is_household_owner(target_household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  if btrim(confirmed_name) <> btrim(household_name) then
    return jsonb_build_object('status', 'name_mismatch');
  end if;

  delete from public.households where id = target_household_id;

  return jsonb_build_object('status', 'deleted');
end;
$$;

create or replace function public.household_photo_manifest(
  target_household_id uuid,
  confirmed_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  household_name text;
  pet_names text[];
  post_names text[];
begin
  if confirmed_name is null then
    return jsonb_build_object('status', 'name_mismatch');
  end if;

  if not private.is_household_owner(target_household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  select name into household_name
  from public.households
  where id = target_household_id;

  if household_name is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if btrim(confirmed_name) <> btrim(household_name) then
    return jsonb_build_object('status', 'name_mismatch');
  end if;

  select coalesce(array_agg(object_name), '{}')
  into pet_names
  from (
    select split_part(split_part(p.photo_url, '/pet-photos/', 2), '?', 1) as object_name
    from public.pets p
    where p.household_id = target_household_id
      and p.photo_url is not null
    union
    select ph.storage_path
    from public.pet_photos ph
    join public.pets p on p.id = ph.pet_id
    where p.household_id = target_household_id
  ) names
  where object_name is not null and object_name <> '';

  select coalesce(array_agg(pp.storage_path), '{}')
  into post_names
  from public.post_photos pp
  join public.posts po on po.id = pp.post_id
  where po.household_id = target_household_id;

  return jsonb_build_object(
    'status', 'ok',
    'pet_photos', to_jsonb(pet_names),
    'post_photos', to_jsonb(post_names)
  );
end;
$$;
