-- A Post carries up to ten photos, and its author can change which ones after
-- the fact.
--
-- No schema change: post_photos and its sort_order were built for exactly this
-- in 20260809090000, before anything wrote more than one row. What changes is
-- that create_post and update_post now take an ordered ARRAY of paths, and
-- update_post owns the photo set the way it already owns the pet tags.
--
-- The two functions keep the array as the whole desired state rather than
-- taking add/remove lists. An edit that uploads two and drops one is then a
-- single statement of what the Post should look like, and the ordering falls
-- out of the array index instead of needing its own column of instructions.

-- Both callers validate the same three things, and a cap enforced only in the
-- client's Zod schema is a cap the next caller ignores.
create or replace function private.assert_post_photo_paths(photo_storage_paths text[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  photo_count integer := coalesce(array_length(photo_storage_paths, 1), 0);
  storage_path text;
begin
  if photo_count = 0 then
    raise exception 'A post needs at least one photo' using errcode = '23514';
  end if;

  if photo_count > 10 then
    raise exception 'A post holds at most 10 photos' using errcode = '23514';
  end if;

  -- The storage policy constrains where a member may UPLOAD, not which path a
  -- post may REFERENCE (20260809100000). On update this also holds for paths
  -- already on the post: only the author can edit, and create put them under
  -- that same uid.
  foreach storage_path in array photo_storage_paths
  loop
    if storage_path is null
      or split_part(storage_path, '/', 1) <> auth.uid()::text then
      raise exception 'photo_storage_path must sit under the author''s own folder'
        using errcode = '42501';
    end if;
  end loop;
end $$;

revoke all on function private.assert_post_photo_paths(text[]) from public, anon;

-- Called from inside the two security-invoker functions below, so it executes
-- as the caller and the caller needs the grant.
grant execute on function private.assert_post_photo_paths(text[]) to authenticated;

-- text -> text[] is a different signature, so the single-path version would
-- survive as an overload and stay reachable.
drop function if exists public.create_post(uuid, text, text, timestamptz, uuid[]);

create or replace function public.create_post(
  target_household_id uuid,
  photo_storage_paths text[],
  post_caption text default null,
  post_occurred_at timestamptz default null,
  tagged_pet_ids uuid[] default '{}'
)
returns public.posts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_post public.posts;
  tagged_pet_id uuid;
begin
  perform private.assert_post_photo_paths(photo_storage_paths);

  insert into public.posts (household_id, author_id, caption, occurred_at)
  values (
    target_household_id,
    auth.uid(),
    nullif(btrim(post_caption), ''),
    coalesce(post_occurred_at, now())
  )
  returning * into new_post;

  insert into public.post_photos (post_id, storage_path, sort_order)
  select new_post.id, photo.path, photo.position - 1
  from unnest(photo_storage_paths) with ordinality as photo(path, position);

  foreach tagged_pet_id in array coalesce(tagged_pet_ids, '{}')
  loop
    insert into public.post_pets (post_id, pet_id)
    values (new_post.id, tagged_pet_id)
    on conflict do nothing;
  end loop;

  return new_post;
end $$;

revoke all on function public.create_post(uuid, text[], text, timestamptz, uuid[]) from public, anon;
grant execute on function public.create_post(uuid, text[], text, timestamptz, uuid[]) to authenticated;

drop function if exists public.update_post(uuid, text, uuid[]);

create or replace function public.update_post(
  target_post_id uuid,
  photo_storage_paths text[],
  post_caption text default null,
  tagged_pet_ids uuid[] default '{}'
)
returns public.posts
language plpgsql
set search_path = ''
as $$
declare
  edited_post public.posts;
  current_caption text;
  new_caption text;
  tagged uuid[] := coalesce(tagged_pet_ids, '{}');
  tagged_pet_id uuid;
  changed boolean := false;
begin
  perform private.assert_post_photo_paths(photo_storage_paths);

  new_caption := nullif(btrim(post_caption), '');

  -- Authorisation and existence in one read. The select policy would let any
  -- Member see this row, so author_id is tested here rather than relied upon.
  select caption into current_caption
  from public.posts
  where id = target_post_id
    and author_id = auth.uid();

  if not found then
    raise exception 'That post is not yours to edit' using errcode = '42501';
  end if;

  delete from public.post_photos
  where post_id = target_post_id
    and not (storage_path = any (photo_storage_paths));

  changed := found;

  insert into public.post_photos (post_id, storage_path, sort_order)
  select target_post_id, photo.path, photo.position - 1
  from unnest(photo_storage_paths) with ordinality as photo(path, position)
  where not exists (
    select 1
    from public.post_photos existing
    where existing.post_id = target_post_id
      and existing.storage_path = photo.path
  );

  changed := changed or found;

  -- Whatever survived may have moved. Rows are re-ordered rather than dropped
  -- and re-inserted so a photo keeps its id and created_at across an edit that
  -- only shuffled it.
  update public.post_photos
  set sort_order = photo.position - 1
  from unnest(photo_storage_paths) with ordinality as photo(path, position)
  where post_photos.post_id = target_post_id
    and post_photos.storage_path = photo.path
    and post_photos.sort_order is distinct from photo.position - 1;

  changed := changed or found;

  delete from public.post_pets
  where post_id = target_post_id
    and not (pet_id = any (tagged));

  changed := changed or found;

  foreach tagged_pet_id in array tagged
  loop
    insert into public.post_pets (post_id, pet_id)
    values (target_post_id, tagged_pet_id)
    on conflict do nothing;

    changed := changed or found;
  end loop;

  if changed or current_caption is distinct from new_caption then
    update public.posts
    set caption = new_caption
    where id = target_post_id
    returning * into edited_post;
  else
    select * into edited_post from public.posts where id = target_post_id;
  end if;

  return edited_post;
end $$;

revoke all on function public.update_post(uuid, text[], text, uuid[]) from public, anon;
grant execute on function public.update_post(uuid, text[], text, uuid[]) to authenticated;

-- Re-ordering a surviving photo is an UPDATE, and post_photos was granted
-- select/insert/delete only -- correctly, back when nothing could edit one.
grant update (sort_order) on public.post_photos to authenticated;

-- The same gap ADR 0018 closed for post_pets, still open here only because no
-- UI reached post_photos. An Owner may delete a member's Post; they may not
-- rewrite what it says, and its photos are what it says.
drop policy "Authors and owners can write post photos" on public.post_photos;

create policy "Authors can write their own post's photos"
on public.post_photos for all
using ( private.is_post_author(post_id) )
with check ( private.is_post_author(post_id) );
