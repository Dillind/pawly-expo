-- Alone in its own migration, like 20260809090150 and 20260815090000: Postgres
-- forbids using a new enum value in the transaction that added it, so the
-- triggers that name these live in the next file.

alter type public.alert_kind add value if not exists 'post_commented';
alter type public.alert_kind add value if not exists 'comment_liked';
