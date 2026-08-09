-- Its own migration on purpose. Postgres will not let a newly added enum value
-- be USED in the same transaction that added it, and Supabase runs each
-- migration file in one transaction. Adding 'post' here means it is committed
-- before 20260809090200 defines the trigger that inserts it.

alter type public.alert_kind add value if not exists 'post';
