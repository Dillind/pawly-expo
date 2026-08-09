-- "Is there anything here I have not seen" is a question about when the row
-- arrived, not about when the photo was taken. occurred_at is the sort key and
-- is author-settable; created_at is the arrival fact and is not. They are equal
-- today because nothing sets occurred_at, but keying the dot on the settable
-- one means a post dated behind posts_last_seen_at would insert, push, and
-- never dot.
create or replace function public.has_unseen_posts(target_household_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.posts
    where posts.household_id = target_household_id
      and posts.created_at > coalesce(
        (
          select household_members.posts_last_seen_at
          from public.household_members
          where household_members.household_id = target_household_id
            and household_members.user_id = auth.uid()
        ),
        '-infinity'::timestamptz
      )
  );
$$;

revoke all on function public.has_unseen_posts(uuid) from public, anon;
grant execute on function public.has_unseen_posts(uuid) to authenticated;
