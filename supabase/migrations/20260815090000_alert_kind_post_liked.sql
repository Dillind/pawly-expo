-- Its own migration for the reason 20260809090150 gives: Postgres will not let
-- a newly added enum value be USED in the transaction that added it, and
-- Supabase runs each migration file in one.

alter type public.alert_kind add value if not exists 'post_liked';
