-- Comments on a Post. See ADR 0031.
--
-- Two levels, not a tree: a comment either stands alone or answers one that
-- does. The audience is inherited whole from the Post, so there is no
-- visibility column here either -- 20260809090000 says why.

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  -- Nullable like posts.author_id: only a deleted account anonymises the row.
  author_id uuid references public.users (id) on delete set null,
  -- Null means top-level. Cascade, not set null -- a reply promoted to
  -- top-level answers a question nobody can see.
  parent_comment_id uuid references public.post_comments (id) on delete cascade,
  -- Who the reply is aimed at, which is NOT always the parent's author: a reply
  -- to a sibling flattens under the same parent but still points at the sibling.
  reply_to_user_id uuid references public.users (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index post_comments_post_created_idx
  on public.post_comments (post_id, created_at);

create index post_comments_parent_idx
  on public.post_comments (parent_comment_id)
  where parent_comment_id is not null;

-- Both invariants read another row, which a check constraint cannot do. Neither
-- is reachable through the composer; the table has to refuse the row on its own,
-- because a service-role script is a writer the UI does not mediate.
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

-- Every SECURITY DEFINER function in `public` needs this -- see 20260809090200.
revoke execute on function public.enforce_comment_depth() from public, anon, authenticated;

-- The composite primary key is what makes "one Like per member per Comment" a
-- database guarantee, the same trick post_likes uses.
create table public.comment_likes (
  comment_id uuid not null references public.post_comments (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create index comment_likes_comment_id_idx on public.comment_likes (comment_id);

-- Definer for the same reason is_post_household_member is: called from the
-- policies of a table that has RLS enabled.
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

-- Deliberately the same test can_manage_post already applies to a post's photos
-- and tags: hosting the conversation carries the same authority over it.
create policy "Comment authors, post authors and owners can delete comments"
on public.post_comments for delete
using (
  author_id = auth.uid()
  or private.can_manage_post(post_id)
);

-- No update policy and no update grant: there is no edit.

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
