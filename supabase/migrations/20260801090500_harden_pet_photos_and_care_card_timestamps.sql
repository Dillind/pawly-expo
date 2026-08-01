create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

revoke all on function private.set_updated_at() from public;

create trigger care_cards_set_updated_at
before update on public.care_cards
for each row
execute function private.set_updated_at();

create or replace function private.enforce_pet_photo_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.pet_id::text, 0));

  if (select count(*) from public.pet_photos where pet_id = new.pet_id) >= 10 then
    raise exception 'A pet can have at most 10 photos'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create or replace function public.add_pet_photo(
  p_pet_id uuid,
  p_storage_path text
)
returns public.pet_photos
language plpgsql
security invoker
set search_path = ''
as $$
declare
  inserted_photo public.pet_photos;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_pet_id::text, 0));

  insert into public.pet_photos (pet_id, storage_path, sort_order)
  select
    p_pet_id,
    p_storage_path,
    coalesce(max(sort_order) + 1, 0)
  from public.pet_photos
  where pet_id = p_pet_id
  returning * into inserted_photo;

  return inserted_photo;
end $$;

revoke all on function public.add_pet_photo(uuid, text) from public, anon;
grant execute on function public.add_pet_photo(uuid, text) to authenticated;

create or replace function public.delete_pet_photo(
  p_photo_id uuid,
  p_photo_url text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  deleted_count integer;
  photo_pet_id uuid;
  photo_storage_path text;
begin
  select pet_id, storage_path
  into photo_pet_id, photo_storage_path
  from public.pet_photos
  where id = p_photo_id;

  if photo_storage_path is null then
    raise exception 'Photo not found'
      using errcode = 'no_data_found';
  end if;

  update public.pets
  set photo_url = null
  where id = photo_pet_id
    and photo_url = p_photo_url;

  delete from public.pet_photos
  where id = p_photo_id;

  get diagnostics deleted_count = row_count;
  if deleted_count <> 1 then
    raise exception 'Photo could not be deleted'
      using errcode = 'insufficient_privilege';
  end if;

  return photo_storage_path;
end $$;

revoke all on function public.delete_pet_photo(uuid, text) from public, anon;
grant execute on function public.delete_pet_photo(uuid, text) to authenticated;

drop policy if exists "Users can upload their own pet photos" on storage.objects;

create policy "Users can upload their own pet photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pet-photos'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and case
    when (storage.foldername(name))[2] is null then true
    when (storage.foldername(name))[2] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then private.is_pet_household_owner(((storage.foldername(name))[2])::uuid)
    else false
  end
);

create policy "Owners can delete pet photo objects"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'pet-photos'
  and case
    when (storage.foldername(name))[2] is null
      then (storage.foldername(name))[1] = (select auth.uid()::text)
    when (storage.foldername(name))[2] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then private.is_pet_household_owner(((storage.foldername(name))[2])::uuid)
    else false
  end
);
