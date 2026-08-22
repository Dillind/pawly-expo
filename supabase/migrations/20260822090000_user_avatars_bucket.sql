-- Storage for user profile photos, mirroring the post-photos setup in
-- 20260809090300.
--
-- Public, for the same reason: reads go through getPublicUrl(), which bypasses
-- storage.objects RLS by design. The policies below are what actually restrict
-- writes. Idempotent so it is a no-op where the bucket already exists.
insert into storage.buckets (id, name, public)
values ('user-avatars', 'user-avatars', true)
on conflict (id) do nothing;

-- Path shape is {user_id}/{uuid}.jpg, so the first folder is the owner. Anyone
-- signed in may write under their OWN folder and nowhere else; users.avatar_url
-- is what makes an object reachable by the app.
create policy "Users can upload their own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Deleting an object needs SELECT on it, not just DELETE: the storage API
-- resolves the object before removing it. Without this every remove() silently
-- matches nothing and reports success, leaving the old file behind -- the bug
-- 20260801090700 records for pet-photos.
create policy "Users can view their own avatar objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
