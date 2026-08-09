-- A Post with no photo must never exist -- the photo IS the content, and a
-- caption-only row would render an empty card that nothing can delete except
-- its author. Three inserts across three tables cannot guarantee that from the
-- client: a dropped connection between the posts insert and the post_photos
-- insert leaves exactly that orphan.
--
-- So creation goes through one function, in one transaction. Same reasoning as
-- log_feed, minus the advisory lock: two members posting at once is not a
-- correctness problem, because unlike a Double Feed there is nothing to
-- serialise. They are independent rows.
--
-- security invoker, NOT definer, deliberately. The policies in 20260809090000
-- are the authorisation -- membership, author_id = auth.uid(), the seven-day
-- window, the pet-belongs-to-this-household check. Running as definer would
-- bypass every one of them and move the rules into this function's body, where
-- they would have to be kept in step with the policies by hand.

create or replace function public.create_post(
  target_household_id uuid,
  photo_storage_path text,
  post_caption text default null,
  post_occurred_at timestamptz default null,
  tagged_pet_ids uuid[] default '{}'
)
returns public.posts
language plpgsql
set search_path = ''
as $$
declare
  new_post public.posts;
  tagged_pet_id uuid;
begin
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
