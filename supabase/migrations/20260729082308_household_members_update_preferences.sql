-- Lets a Member change their own alert preferences.
--
-- household_members had RLS enabled with only select and insert policies, so
-- the Manage Notifications toggle wrote to a table it could not update: the
-- statement matched zero rows and PostgREST reported success, leaving the
-- toggle to revert on the next refetch with no error anywhere.
--
-- The policy alone would be an escalation hole. Supabase grants table-wide
-- update to authenticated by default, so a `user_id = auth.uid()` policy would
-- also let a Contributor set their own role to 'owner', or move their row to
-- another household. Narrowing the column grant is what confines the write to
-- the preference columns -- the same pattern feed_logs uses for corrections.
--
-- missed_feed_alerts is deliberately NOT granted: the column exists but no UI
-- exposes it, and a grant for a write that cannot happen is one more thing to
-- get wrong when it does ship.
revoke update on public.household_members from anon, authenticated;

grant update (feed_logged_alerts) on public.household_members to authenticated;

create policy "Members can update their own alert preferences"
on public.household_members for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
