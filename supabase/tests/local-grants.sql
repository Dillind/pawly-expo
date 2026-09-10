-- Supabase grants anon/authenticated on every public table by default; RLS is
-- the real gate. Without this the shim denies at the grant layer and the policy
-- is never reached.
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
