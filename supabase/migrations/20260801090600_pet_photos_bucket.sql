-- The pet-photos bucket was created by hand in the dashboard, long before any
-- of this was in migrations. A clean `supabase db reset` therefore produced a
-- database this app could not upload to at all, with nothing in the repo to say
-- why. This records it.
--
-- Idempotent on purpose: production already has the bucket, so this must be a
-- no-op there rather than an error.
--
-- Public is deliberate. Reads go through getPublicUrl(), which bypasses
-- storage.objects RLS by design; the insert and delete policies in
-- 20260801090500 are what actually restrict writes.
insert into storage.buckets (id, name, public)
values ('pet-photos', 'pet-photos', true)
on conflict (id) do nothing;
