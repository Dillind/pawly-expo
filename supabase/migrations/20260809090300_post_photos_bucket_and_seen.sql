-- Storage for post photos, mirroring the pet-photos setup in 20260801090500/600.
--
-- Public, for the same reason: reads go through getPublicUrl(), which bypasses
-- storage.objects RLS by design. The insert and delete policies below are what
-- actually restrict writes. Idempotent so it is a no-op where the bucket
-- already exists.
insert into storage.buckets (id, name, public)
values ('post-photos', 'post-photos', true)
on conflict (id) do nothing;

-- Path shape is {user_id}/{household_id}/{uuid}.jpg, so the first folder is the
-- uploader. Anyone signed in may write under their OWN folder and nowhere else.
-- The row in post_photos is what makes an object reachable by the app; an
-- orphaned object is invisible, which is the same trade the pet-photos policies
-- make.
create policy "Users can upload their own post photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own post photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'post-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Drives the dot on the Household tab. Per member, because "seen" is a property
-- of this person in this household -- the same reasoning that put the alert
-- preferences here rather than on users.
--
-- Nullable with no default: null means "has never opened the tab", which is not
-- the same as "opened it at the epoch" and shows the dot for a household that
-- already has posts.
alter table public.household_members
  add column posts_last_seen_at timestamptz;

-- Column-level, per 20260729082308. The existing "Members can update their own
-- alert preferences" policy already restricts the row to user_id = auth.uid(),
-- so this grant is the only thing standing between the app and a write that
-- silently matches zero rows.
grant update (posts_last_seen_at) on public.household_members to authenticated;
