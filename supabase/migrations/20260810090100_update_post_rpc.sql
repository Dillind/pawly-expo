-- One function for the reason creation is: an edit changes the caption and the
-- pet tags together, and three client statements can leave a post with the new
-- caption and the old tags, with nothing to roll back to.
--
-- security invoker, like create_post. The policies in 20260810090000 are the
-- authorisation; definer would bypass them and move the author check into this
-- body, to be kept in step by hand.

create or replace function public.update_post(
  target_post_id uuid,
  post_caption text default null,
  tagged_pet_ids uuid[] default '{}'
)
returns public.posts
language plpgsql
set search_path = ''
as $$
declare
  edited_post public.posts;
  tagged_pet_id uuid;
begin
  update public.posts
  set caption = nullif(btrim(post_caption), '')
  where id = target_post_id
  returning * into edited_post;

  -- RLS filters the row out rather than raising, so "not yours" and "gone"
  -- both arrive here as zero rows updated.
  if edited_post.id is null then
    raise exception 'That post is not yours to edit' using errcode = '42501';
  end if;

  delete from public.post_pets
  where post_id = target_post_id
    and not (pet_id = any (coalesce(tagged_pet_ids, '{}')));

  foreach tagged_pet_id in array coalesce(tagged_pet_ids, '{}')
  loop
    insert into public.post_pets (post_id, pet_id)
    values (target_post_id, tagged_pet_id)
    on conflict do nothing;
  end loop;

  return edited_post;
end $$;

revoke all on function public.update_post(uuid, text, uuid[]) from public, anon;
grant execute on function public.update_post(uuid, text, uuid[]) to authenticated;
