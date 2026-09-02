-- A Post carries an Occasion, and the RPCs learn to write it.
--
-- The policies are widened first. Without the household test a member of two
-- households could put one household's Occasion on the other's Post, and the
-- chip would then render a label to people who cannot see where it came from
-- -- the same leak the pet-tag policy already guards against.

drop policy "Members can write their own posts" on public.posts;

create policy "Members can write their own posts"
on public.posts for insert
with check (
  private.is_household_member(household_id)
  and author_id = auth.uid()
  and occurred_at <= now()
  and occurred_at >= now() - interval '7 days'
  and (
    occasion_id is null
    or private.is_occasion_in_household(occasion_id, household_id)
  )
);

drop policy "Authors can edit their own posts" on public.posts;

create policy "Authors can edit their own posts"
on public.posts for update
using ( author_id = auth.uid() )
with check (
  author_id = auth.uid()
  and (
    occasion_id is null
    or private.is_occasion_in_household(occasion_id, household_id)
  )
);

drop function if exists public.create_post(uuid, text[], text, text, timestamptz, uuid[]);

create or replace function public.create_post(
  target_household_id uuid,
  photo_storage_paths text[],
  post_title text default null,
  post_caption text default null,
  post_occurred_at timestamptz default null,
  tagged_pet_ids uuid[] default '{}',
  post_occasion_id uuid default null
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

  insert into public.posts (household_id, author_id, title, caption, occurred_at, occasion_id)
  values (
    target_household_id,
    auth.uid(),
    nullif(btrim(post_title), ''),
    nullif(btrim(post_caption), ''),
    coalesce(post_occurred_at, now()),
    post_occasion_id
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

revoke all on function public.create_post(uuid, text[], text, text, timestamptz, uuid[], uuid)
  from public, anon;
grant execute on function public.create_post(uuid, text[], text, text, timestamptz, uuid[], uuid)
  to authenticated;

drop function if exists public.update_post(uuid, text[], text, text, uuid[]);

create or replace function public.update_post(
  target_post_id uuid,
  photo_storage_paths text[],
  post_title text default null,
  post_caption text default null,
  tagged_pet_ids uuid[] default '{}',
  post_occasion_id uuid default null
)
returns public.posts
language plpgsql
set search_path = ''
as $$
declare
  edited_post public.posts;
  current_title text;
  current_caption text;
  current_occasion_id uuid;
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
  select title, caption, occasion_id
    into current_title, current_caption, current_occasion_id
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
    or current_caption is distinct from new_caption
    or current_occasion_id is distinct from post_occasion_id then
    update public.posts
    set title = new_title,
        caption = new_caption,
        occasion_id = post_occasion_id
    where id = target_post_id
    returning * into edited_post;
  else
    select * into edited_post from public.posts where id = target_post_id;
  end if;

  return edited_post;
end $$;

revoke all on function public.update_post(uuid, text[], text, text, uuid[], uuid) from public, anon;
grant execute on function public.update_post(uuid, text[], text, text, uuid[], uuid) to authenticated;
