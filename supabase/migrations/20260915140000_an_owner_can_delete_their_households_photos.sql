-- Deleting a Household left its photos in the buckets. Postgres refuses a
-- `delete from storage.objects` outright, so the objects have to go through the
-- Storage API, which means the Owner's own client -- and the DELETE policies
-- did not let the Owner near most of them:
--
--   pet-photos   the Owner may delete a photo filed under a Pet id, but a cover
--                is filed under the uploader's id, so another member's cover
--                was refused.
--   post-photos  uploader only. An Owner could never delete another member's
--                Post photos, and those are spread across everyone who posted.
--
-- Both policies keyed off the object's *path*, which is why they could not see
-- the Household. These two key off the rows instead.

-- One helper, used by both policies and by the manifest below, so "which
-- objects belong to this Household" has a single definition.
create or replace function private.is_household_photo(bucket text, object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case bucket
    when 'pet-photos' then exists (
      select 1
      from public.pets p
      where private.is_household_owner(p.household_id)
        and (
          split_part(split_part(p.photo_url, '/pet-photos/', 2), '?', 1) = object_name
          or exists (
            select 1
            from public.pet_photos ph
            where ph.pet_id = p.id
              and ph.storage_path = object_name
          )
        )
    )
    when 'post-photos' then exists (
      select 1
      from public.post_photos pp
      join public.posts po on po.id = pp.post_id
      where pp.storage_path = object_name
        and private.is_household_owner(po.household_id)
    )
    else false
  end;
$$;

revoke execute on function private.is_household_photo(text, text) from public, anon;
grant execute on function private.is_household_photo(text, text) to authenticated;

create policy "Owners can delete their household's pet photo objects"
on storage.objects for delete to authenticated
using (bucket_id = 'pet-photos' and private.is_household_photo('pet-photos', name));

create policy "Owners can delete their household's post photo objects"
on storage.objects for delete to authenticated
using (bucket_id = 'post-photos' and private.is_household_photo('post-photos', name));

-- The list the client hands to the Storage API. Owner-gated and name-gated in
-- the same breath as `delete_household`, so a caller cannot use it to read a
-- Household's file paths without being able to delete the Household anyway.
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
  if not private.is_household_owner(target_household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  select name into household_name
  from public.households
  where id = target_household_id;

  if household_name is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  if btrim(confirmed_name) <> household_name then
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

revoke execute on function public.household_photo_manifest(uuid, text) from public, anon;
grant execute on function public.household_photo_manifest(uuid, text) to authenticated;
