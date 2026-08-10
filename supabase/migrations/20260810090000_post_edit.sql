-- Editing a Post. Reverses the "no edit in v1" decision in 20260809090000.
-- The reasoning, and why editing is narrower than deleting, is ADR 0018.

alter table public.posts add column edited_at timestamptz;

-- Set by the database, never by the client. A client-supplied timestamp is a
-- claim; this is a fact.
create or replace function private.stamp_post_edited()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.edited_at := now();
  return new;
end $$;

create trigger posts_stamp_edited
before update on public.posts
for each row
execute function private.stamp_post_edited();

-- can_manage_post includes Owners, which is right for delete and wrong for
-- edit (ADR 0018), so editing needs its own test.
create or replace function private.is_post_author(target_post_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.posts
    where posts.id = target_post_id
      and posts.author_id = auth.uid()
  );
$$;

create policy "Authors can edit their own posts"
on public.posts for update
using ( author_id = auth.uid() )
with check ( author_id = auth.uid() );

-- Caption only. occurred_at, household_id and author_id stay unreachable from
-- the client, so an edit cannot move a post in the stream, hand it to another
-- household, or reassign who wrote it -- none of which the UPDATE policy on its
-- own would have stopped.
grant update (caption) on public.posts to authenticated;

-- Pet tags follow the same author-only rule, for the same reason: they are part
-- of what the post says. The existing policy used can_manage_post, which let an
-- Owner add or remove tags on a member's post -- a gap only because there was
-- no edit UI to reach it through. Creation is unaffected: at insert time the
-- author IS auth.uid().
drop policy "Authors and owners can write post pet tags" on public.post_pets;

create policy "Authors can write their own post's pet tags"
on public.post_pets for all
using ( private.is_post_author(post_id) )
with check (
  private.is_post_author(post_id)
  and private.is_pet_in_post_household(post_id, pet_id)
);
