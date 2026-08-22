-- Comments on a Post. See CRU-049 and the ADR that lands with it.
--
-- TWO LEVELS, NOT A TREE. A comment either stands on its own or answers one
-- that does. A reply to a reply becomes another child of the same parent, and
-- reply_to_user_id records who it was aimed at so the row can render "@Sarah".
-- Unlimited nesting is a Reddit pattern that reads badly on a phone, and the
-- depth is enforced here rather than in the UI because the UI is not the only
-- thing that can insert a row.
--
-- The audience is inherited whole from the Post, which inherits it from the
-- household (20260809090000). There is no visibility column here either, for
-- exactly the same reasons.

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  -- Nullable, on delete set null, mirroring posts.author_id: a member who
  -- leaves keeps their name on what they wrote. Only a deleted account
  -- anonymises the row.
  author_id uuid references public.users (id) on delete set null,
  -- Null means top-level. Cascade rather than set null: a reply orphaned into
  -- a top-level comment is a sentence that answers a question nobody can see.
  parent_comment_id uuid references public.post_comments (id) on delete cascade,
  -- Who the reply is aimed at, which is NOT always the parent's author -- a
  -- reply to a sibling reply flattens under the same parent but still points at
  -- the sibling. Null on a top-level comment, and null once that account is
  -- deleted, in which case the "@name" prefix simply does not render.
  reply_to_user_id uuid references public.users (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Oldest first at both levels, which is how the thread reads.
create index post_comments_post_created_idx
  on public.post_comments (post_id, created_at);

create index post_comments_parent_idx
  on public.post_comments (parent_comment_id)
  where parent_comment_id is not null;

-- Both invariants need to read ANOTHER row, which a check constraint cannot do.
--
-- Neither is reachable through the app -- the composer only ever offers a
-- top-level comment's id as a parent. They are here because the table must
-- refuse the row on its own: a service-role script, a future RPC, or a
-- hand-written insert are all writers the UI does not mediate.
create or replace function public.enforce_comment_depth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_post_id uuid;
  parent_parent_id uuid;
begin
  if new.parent_comment_id is null then
    return new;
  end if;

  select post_id, parent_comment_id
    into parent_post_id, parent_parent_id
  from public.post_comments
  where id = new.parent_comment_id;

  if parent_post_id is null then
    raise exception 'Parent comment does not exist';
  end if;

  if parent_post_id <> new.post_id then
    raise exception 'A reply must belong to the same post as its parent';
  end if;

  if parent_parent_id is not null then
    raise exception 'Comments are two levels deep -- reply to the top-level comment instead';
  end if;

  return new;
end $$;

create trigger post_comments_enforce_depth
before insert on public.post_comments
for each row
execute function public.enforce_comment_depth();

-- Every SECURITY DEFINER function in `public` needs this: the schema is
-- exposed, so without it the function is callable at /rest/v1/rpc/<name>.
revoke execute on function public.enforce_comment_depth() from public, anon, authenticated;

-- The composite primary key is what makes "one Like per member per Comment" a
-- database guarantee rather than a UI convention -- the same trick post_likes
-- uses.
create table public.comment_likes (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_likes_comment_id_idx on public.comment_likes (comment_id);

-- Reads the comment's post, so it must be definer for the same reason
-- is_post_household_member is: post_comments has RLS enabled and these helpers
-- are called from its own policies.
create or replace function private.is_comment_household_member(target_comment_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.post_comments c
    join public.posts p on p.id = c.post_id
    join public.household_members m on m.household_id = p.household_id
    where c.id = target_comment_id
      and m.user_id = auth.uid()
  );
$$;

alter table public.post_comments enable row level security;

create policy "Members can view comments on their household's posts"
on public.post_comments for select
using ( private.is_post_household_member(post_id) );

create policy "Members can comment as themselves"
on public.post_comments for insert
with check (
  private.is_post_household_member(post_id)
  and author_id = auth.uid()
);

-- The comment's own author, or anyone who could delete the post itself -- the
-- post's author and the household's Owners. Deliberately the same test
-- can_manage_post already applies to a post's photos and tags: hosting the
-- conversation carries the same authority over it.
create policy "Comment authors, post authors and owners can delete comments"
on public.post_comments for delete
using (
  author_id = auth.uid()
  or private.can_manage_post(post_id)
);

-- No update policy and no update grant, deliberately. There is no edit: a
-- comment is short enough that delete-and-retype costs nothing, and an edit
-- would need an edited_at, a marker, and a rule about what happens to the
-- replies underneath a rewritten parent.

alter table public.comment_likes enable row level security;

create policy "Members can view comment likes"
on public.comment_likes for select
using ( private.is_comment_household_member(comment_id) );

create policy "Members can like a comment as themselves"
on public.comment_likes for insert
with check (
  private.is_comment_household_member(comment_id)
  and user_id = auth.uid()
);

create policy "Members can remove their own comment like"
on public.comment_likes for delete
using ( user_id = auth.uid() );

revoke all on public.post_comments from anon, authenticated;
revoke all on public.comment_likes from anon, authenticated;

grant select, insert, delete on public.post_comments to authenticated;
grant select, insert, delete on public.comment_likes to authenticated;
