-- The insert in 20260815090100 said a bare `on conflict do nothing`, which
-- arbitrates over EVERY unique constraint on the table, not just the one it
-- meant. It swallows alerts_idempotency_idx too, and is harmless today only
-- because subject_date is null for a like and Postgres treats nulls as
-- distinct -- so a future constraint would start silently dropping rows the
-- trigger intended to write. Every other insert in the alerts migrations names
-- its target; this one now does as well.

create or replace function public.queue_post_liked_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household_id uuid;
  post_author_id uuid;
begin
  select posts.household_id, posts.author_id
    into target_household_id, post_author_id
  from public.posts
  where posts.id = new.post_id;

  if target_household_id is null or post_author_id = new.user_id then
    return new;
  end if;

  insert into public.alerts (household_id, kind, subject_id, actor_id, suppressed_reason)
  values (target_household_id, 'post_liked', new.post_id, new.user_id, 'like')
  on conflict (subject_id, actor_id) where kind = 'post_liked' do nothing;

  return new;
end $$;

revoke execute on function public.queue_post_liked_alert() from public, anon, authenticated;
