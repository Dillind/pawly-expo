-- Deleting a storage object needs SELECT on it, not just DELETE: the storage
-- API resolves the object before removing it. With no select policy on this
-- bucket every remove() silently matched nothing and reported success, so the
-- files stayed behind while the rows went. Verified against production -- as
-- role `authenticated`, storage.objects for this bucket returned 0 rows.
--
-- Reading the image itself never needed this. The bucket is public, so
-- getPublicUrl() bypasses RLS; this is only about the metadata row.
--
-- Mirrors the delete policy, but with member rather than owner on the pet
-- branch: anyone who can see the pet can see its photos.
create policy "Members can view pet photo objects"
on storage.objects for select
to authenticated
using (
  bucket_id = 'pet-photos'
  and case
    when (storage.foldername(name))[2] is null
      then (storage.foldername(name))[1] = (select auth.uid()::text)
    when (storage.foldername(name))[2] ~
      '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      then private.is_pet_household_member(((storage.foldername(name))[2])::uuid)
    else false
  end
);
