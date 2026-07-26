-- The original UPDATE policy's `with check` had a contributor branch --
-- `logged_by = auth.uid() and created_at > now() - interval '24 hours'` --
-- that never mentioned pet_id. Nothing in that branch tied the post-update row
-- to a household the caller belongs to, so any authenticated user could log a
-- feed on their own pet and then move that row into a stranger's history with
-- `update feed_logs set pet_id = <foreign pet>`. Reproduced live.
--
-- Membership is now a conjunct over the whole `with check`, so the destination
-- pet_id is always inside the caller's household. Owner implies member, so this
-- only tightens the contributor branch.
--
-- `using` is deliberately unchanged: it gates on the row's existing pet_id,
-- which was already correct.

drop policy "Owners can update any feed log, contributors their own recent ones"
on public.feed_logs;

create policy "Owners can update any feed log, contributors their own recent ones"
on public.feed_logs for update
using (
  private.is_pet_household_owner(pet_id)
  or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' )
)
with check (
  private.is_pet_household_member(pet_id)
  and ( private.is_pet_household_owner(pet_id)
        or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' ) )
  and logged_at <= now()
  and logged_at >= now() - interval '24 hours'
);
