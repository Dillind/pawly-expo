-- Two corrections to 20260810090000 / 20260810090100, from review.
--
-- 1. edited_at was stamped by any UPDATE, including one that changed nothing.
--    Editing a caption back to what it already said marked the Post Edited.
--    The trigger stays unconditional -- an UPDATE on posts IS an edit -- and
--    update_post now only issues one when something actually differs.
--
--    The check cannot live in the trigger alone: a tag-only edit does not touch
--    posts at all, so a WHEN clause on the row would miss it. Only the function
--    can see both halves of what a Post says.
--
-- 2. The trigger function was security definer, which a BEFORE trigger does not
--    need -- assigning to NEW is not privilege-checked, so the caption-only
--    column grant is no obstacle.

create or replace function private.stamp_post_edited()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.edited_at := now();
  return new;
end $$;

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
  current_caption text;
  new_caption text;
  tagged uuid[] := coalesce(tagged_pet_ids, '{}');
  tagged_pet_id uuid;
  changed boolean := false;
begin
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

  delete from public.post_pets
  where post_id = target_post_id
    and not (pet_id = any (tagged));

  changed := found;

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

revoke all on function public.update_post(uuid, text, uuid[]) from public, anon;
grant execute on function public.update_post(uuid, text, uuid[]) to authenticated;

-- A trigger function is never called by a role, so nothing needs to execute it.
revoke all on function private.stamp_post_edited() from public, anon, authenticated;

-- is_post_author deliberately keeps EXECUTE for authenticated, and so do the
-- other private helpers in 20260809090000. They are called FROM RLS policies,
-- which are evaluated as the querying role -- revoke it and every query
-- embedding post_pets fails with "permission denied", which is the whole
-- Household stream. This is why those helpers were never revoked.
grant execute on function private.is_post_author(uuid) to authenticated;
