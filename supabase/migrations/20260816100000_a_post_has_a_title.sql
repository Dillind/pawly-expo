-- A Post has a title.
--
-- The column is nullable even though the app now requires one. Every Post that
-- already exists has no title, and a `not null default ''` would hand real
-- history a title nobody wrote. The app is the thing that insists; the column
-- only caps the length.

alter table public.posts
  add column title text check (char_length(title) <= 80);

-- update_post is security invoker, so a column absent from this grant is not
-- rejected -- it is silently not written. caption was granted in
-- 20260810090000 for the same reason.
grant update (title) on public.posts to authenticated;

drop function if exists public.create_post(uuid, text[], text, timestamptz, uuid[]);

create or replace function public.create_post(
  target_household_id uuid,
  photo_storage_paths text[],
  post_title text default null,
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

  insert into public.posts (household_id, author_id, title, caption, occurred_at)
  values (
    target_household_id,
    auth.uid(),
    nullif(btrim(post_title), ''),
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

revoke all on function public.create_post(uuid, text[], text, text, timestamptz, uuid[])
  from public, anon;
grant execute on function public.create_post(uuid, text[], text, text, timestamptz, uuid[])
  to authenticated;

drop function if exists public.update_post(uuid, text[], text, uuid[]);

create or replace function public.update_post(
  target_post_id uuid,
  photo_storage_paths text[],
  post_title text default null,
  post_caption text default null,
  tagged_pet_ids uuid[] default '{}'
)
returns public.posts
language plpgsql
set search_path = ''
as $$
declare
  edited_post public.posts;
  current_title text;
  current_caption text;
  new_title text;
  new_caption text;
  tagged uuid[] := coalesce(tagged_pet_ids, '{}');
  tagged_pet_id uuid;
  changed boolean := false;
begin
  perform private.assert_post_photo_paths(photo_storage_paths);

  new_title := nullif(btrim(post_title), '');
  new_caption := nullif(btrim(post_caption), '');

  -- Authorisation and existence in one read. The select policy would let any
  -- Member see this row, so author_id is tested here rather than relied upon.
  select title, caption into current_title, current_caption
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

  if changed
    or current_title is distinct from new_title
    or current_caption is distinct from new_caption then
    update public.posts
    set title = new_title,
        caption = new_caption
    where id = target_post_id
    returning * into edited_post;
  else
    select * into edited_post from public.posts where id = target_post_id;
  end if;

  return edited_post;
end $$;

revoke all on function public.update_post(uuid, text[], text, text, uuid[]) from public, anon;
grant execute on function public.update_post(uuid, text[], text, text, uuid[]) to authenticated;
