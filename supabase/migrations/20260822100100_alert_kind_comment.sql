-- Alone in its own migration, like 20260809090150: Postgres forbids using a new
-- enum value in the transaction that added it.

alter type public.alert_kind add value if not exists 'post_commented';
alter type public.alert_kind add value if not exists 'comment_liked';
