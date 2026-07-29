-- One row per EVENT, not per recipient. Recipients are resolved at send time,
-- so a preference changed between queue and delivery is respected.
--
-- Why an outbox rather than a trigger calling the Edge Function directly: the
-- missed-feed cron (ADR 0002) runs every 15 minutes, and a slot missed at
-- 08:00 is still missed at 08:15, 08:30 and every run after. Without a durable
-- record of "already alerted for this slot on this date" that engine pushes
-- "Bailey hasn't been fed" to the whole household four times an hour -- the
-- exact failure PRODUCT_BRIEF calls fatal, delivered by the feature meant to
-- prevent it. The engine needs a sent-record regardless, so building it now
-- costs nothing extra and avoids ending up with two delivery paths.

create type public.alert_kind as enum ('feed_logged', 'missed_feed');

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kind public.alert_kind not null,
  subject_id uuid not null,
  subject_date date,
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  error text,
  suppressed_reason text
);

-- The idempotency key that makes the missed-feed cron safe to run every 15
-- minutes. Postgres treats nulls as DISTINCT in a unique index, so the
-- feed_logged half (subject_date null) relies on subject_id being a fresh
-- feed_logs.id each time -- which it is. The missed_feed half, where the
-- guarantee actually matters, has a non-null subject_date.
create unique index alerts_idempotency_idx
  on public.alerts (kind, subject_id, subject_date);

-- The Edge Function's work queue: queued, not yet sent, not suppressed.
create index alerts_pending_idx on public.alerts (created_at)
  where sent_at is null and suppressed_reason is null;

alter table public.alerts enable row level security;

-- No policy for `authenticated` in this pass, deliberately. Nothing in the app
-- reads alerts yet; the Edge Function reads with the service role. A future
-- in-app notification history adds a select policy scoped to household
-- membership plus a sparse alert_reads (alert_id, user_id, read_at) table --
-- read state is separate because this table is one row per event, not one per
-- recipient.
--
-- Muting silences the push, not the record. Someone with Feed Logged Alerts
-- off still has the rows; they have asked not to be interrupted, not to be
-- kept in the dark.
--
-- suppressed_reason is a distinct column rather than a reuse of `error`
-- because a suppressed alert is NOT a failure. From outside the database
-- "deliberately not sent" and "delivery broke" look identical; this column is
-- what tells them apart with one query.

revoke all on public.alerts from anon, authenticated;
