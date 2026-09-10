-- A follow request tells the Owner. See ADR 0036 and ADR 0012.
--
-- A Follower gets no push at all in v1, so this is the only alert the feature
-- adds: it runs towards the household, never away from it. Accepting is not
-- announced either -- the follower finds the posts the next time they open the
-- app, and being told "you were accepted" is the beginning of the notification
-- volume this feature is trying not to create.

alter type public.alert_kind add value if not exists 'follow_requested';

-- Committed separately: a new enum value cannot be used in the same transaction
-- that adds it.
commit;

-- One row per Owner, addressed with recipient_id, which is how post_liked and
-- post_commented already address a person. A Contributor is not told: they
-- cannot accept, and an alert that carries no action is noise.
--
-- subject_date stays null, and that is load-bearing. alerts_idempotency_idx is
-- unique over (kind, subject_id, subject_date); Postgres treats nulls as
-- DISTINCT, so several Owners can each hold a row for the same follow without
-- the second insert losing to the first.
create or replace function private.queue_follow_requested_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.alerts (household_id, kind, subject_id, actor_id, recipient_id)
  select new.household_id, 'follow_requested', new.id, new.follower_id, m.user_id
  from public.household_members m
  where m.household_id = new.household_id
    and m.role = 'owner';

  return new;
end $$;

create trigger household_follows_queue_alert
after insert on public.household_follows
for each row
when (new.status = 'pending')
execute function private.queue_follow_requested_alert();
