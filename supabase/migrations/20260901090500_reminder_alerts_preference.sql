-- Delivery is the recipient's decision (ADR 0012), so a new pushing kind needs
-- its own toggle. Default true, like feed_due_alerts: a Reminder nudge never
-- accuses anyone, and it is the reason the feature exists.

alter table public.household_members
  add column reminder_alerts boolean not null default true;

-- household_members takes COLUMN-level update grants, so a preference is
-- invisible to writes until it is named here. The failure is silent: PostgREST
-- reports success and the value reverts on the next refetch.
grant update (reminder_alerts) on public.household_members to authenticated;
