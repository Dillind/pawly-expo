-- The UPDATE policy exempts Owners from the 24h backdating floor, but INSERT
-- applied it to everyone. That asymmetry bought nothing: an Owner blocked from
-- creating a log dated three days ago could create one dated now and then edit it
-- back arbitrarily far, which UPDATE permits. All the floor did on this path was
-- fail the honest route with "That time is more than 24 hours ago" for a role that
-- is not, in fact, restricted.
--
-- The `logged_at <= now()` ceiling stays universal. A future-dated log is a data
-- integrity problem rather than an abuse question -- it breaks slot matching and
-- day grouping -- so no role is exempt from it.
--
-- `logged_by = auth.uid()` still binds Owners: an Owner logs as themselves and
-- cannot author a log in another member's name.
--
-- Renamed to feed_logs_insert for consistency with feed_logs_select/_update/
-- _delete, which were renamed in 20260725090300 to stay under NAMEDATALEN.

drop policy "Members can log feeds for their household's pets" on public.feed_logs;

create policy "feed_logs_insert" on public.feed_logs for insert to authenticated
with check (
  private.is_pet_household_member(pet_id)
  and logged_by = (select auth.uid())
  and logged_at <= now()
  and ( private.is_pet_household_owner(pet_id)
        or logged_at >= now() - interval '24 hours' )
);
