-- The storage policy constrains where a member may UPLOAD -- the first path
-- segment must be their own uid. It says nothing about which path a post may
-- REFERENCE, so create_post would happily attach someone else's object to your
-- post. Members already see every post in their household, so this leaks
-- nothing today; it would matter the moment a photo outlives its post or a
-- member is removed.
create or replace function public.create_post(
  target_household_id uuid,
  photo_storage_path text,
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
  if photo_storage_path is null
    or split_part(photo_storage_path, '/', 1) <> auth.uid()::text then
    raise exception 'photo_storage_path must sit under the author''s own folder'
      using errcode = '42501';
  end if;

  insert into public.posts (household_id, author_id, caption, occurred_at)
  values (
    target_household_id,
    auth.uid(),
    nullif(btrim(post_caption), ''),
    coalesce(post_occurred_at, now())
  )
  returning * into new_post;

  insert into public.post_photos (post_id, storage_path, sort_order)
  values (new_post.id, photo_storage_path, 0);

  foreach tagged_pet_id in array coalesce(tagged_pet_ids, '{}')
  loop
    insert into public.post_pets (post_id, pet_id)
    values (new_post.id, tagged_pet_id)
    on conflict do nothing;
  end loop;

  return new_post;
end $$;

revoke all on function public.create_post(uuid, text, text, timestamptz, uuid[]) from public, anon;
grant execute on function public.create_post(uuid, text, text, timestamptz, uuid[]) to authenticated;
