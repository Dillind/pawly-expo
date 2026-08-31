-- Alone in its own migration, like 20260828090000: Postgres forbids using a new
-- enum value in the transaction that added it.

alter type public.alert_kind add value if not exists 'reminder_due';
