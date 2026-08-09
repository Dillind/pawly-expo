-- The third Alert kind. Delivery follows ADR 0012 unchanged: the trigger
-- queues a row, the outbox sends it, send-alerts resolves recipients at send
-- time so a preference changed between queue and delivery is respected.
--
-- A BACKDATED POST STILL PUSHES. This is the deliberate difference from
-- queue_feed_logged_alert, and it will look like an oversight to anyone who
-- reads the two side by side, so: a Feed Logged Alert exists to prevent a
-- Double Feed, and that value decays with the age of the feed -- a fourteen-
-- hour-old "Dylan fed Bailey" is noise about something already handled. A Post
-- has no such decay. A photo from three days ago is still a photo you want to
-- see, and the whole point of the feature is the person who is away. Same
-- mechanism, opposite answer, because the content is not the same kind of
-- thing.
--
-- Likes never queue an alert at all. A thumbs-up is not worth an interruption,
-- and the first time somebody gets three pushes because three people liked one
-- photo, they mute the app -- including the Missed Feed Alert that matters.

-- The 'post' enum value itself is added in 20260809090150, separately, because
-- Postgres forbids using a new enum value in the transaction that added it.

alter table public.household_members
  add column post_alerts boolean not null default true;

-- Unlike feed_logged_alerts, this defaults ON. The quiet-by-default rule in
-- 20260728090100 protects against a forgotten code path making noise about
-- FEEDING, three times a day, forever. Posts are occasional and deliberate --
-- somebody chose to share something -- and a Post Alert that silently defaults
-- off means the away-from-home case, the entire reason the feature exists,
-- does not work until the user finds a toggle they do not know about.

-- household_members takes COLUMN-level update grants (20260729082308) -- a
-- table-wide grant would let a Contributor set their own role to 'owner'. A new
-- preference column is therefore invisible to writes until named here, and the
-- symptom is the one that migration describes: the toggle appears to save, then
-- reverts on refetch with no error anywhere.
grant update (post_alerts) on public.household_members to authenticated;

create or replace function public.queue_post_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.alerts (household_id, kind, subject_id, actor_id)
  values (new.household_id, 'post', new.id, new.author_id);

  return new;
end $$;

create trigger posts_queue_alert
after insert on public.posts
for each row
execute function public.queue_post_alert();

-- A trigger function has no business being callable over the API. It sits in
-- `public`, which PostgREST exposes, so without this it is reachable at
-- /rest/v1/rpc/queue_post_alert by anon -- as SECURITY DEFINER, meaning it
-- would insert an alerts row on behalf of the definer for any household_id the
-- caller cared to name. The security advisor flagged it immediately.
--
-- 20260728110915 did exactly this for queue_feed_logged_alert. The precedent
-- was there and this missed it; the revoke belongs next to every definer
-- trigger function from now on.
revoke execute on function public.queue_post_alert() from public, anon, authenticated;
