-- Grants: the client may only ever write logged_at and notes.
--
-- Nothing in the product changes a log's pet_id, logged_by or created_at, and
-- leaving them writable made three separate holes reachable: rewriting pet_id to
-- plant a row in a stranger's household (fixed in 20260725090200 at the policy
-- layer), renewing the 24h contributor edit window with `set created_at = now()`,
-- and fabricating attribution with `set logged_by = <someone else>`. A column
-- grant closes all three below RLS, where no policy edit can reopen them.
revoke all on public.feed_logs from anon;
revoke insert, update on public.feed_logs from authenticated;
grant insert (pet_id, logged_by, logged_at, notes) on public.feed_logs to authenticated;
grant update (logged_at, notes) on public.feed_logs to authenticated;

-- Policy names are recreated under 63 bytes. The originals exceeded NAMEDATALEN
-- and were silently truncated in the catalogue, so the name in the source never
-- equalled the name in pg_policies -- a trap for the next `alter policy`.

drop policy "Members can view feed logs for their household's pets" on public.feed_logs;

create policy "feed_logs_select" on public.feed_logs for select to authenticated
using ( private.is_pet_household_member(pet_id) );

drop policy "Owners can update any feed log, contributors their own recent ones"
on public.feed_logs;

-- The membership conjunct is now in `using` as well as `with check`. Only the
-- owner branch ever named pet_id; the contributor branch names logged_by and
-- created_at alone, so on its own it says nothing about which household the row
-- belongs to. `with check` backstopped that for UPDATE, but relying on the
-- backstop is what left the DELETE twin below exploitable.
--
-- The 24h backdating FLOOR now sits inside the contributor branch, not over the
-- whole check. Bounding it unconditionally froze every log once it aged past 24h
-- -- an Owner editing only `notes` on a 3-day-old log got 42501, contradicting
-- "Owners unrestricted". The `logged_at <= now()` CEILING stays universal: a
-- future-dated log is a data-integrity problem, not an abuse question, because it
-- breaks the slot matcher and day grouping.
create policy "feed_logs_update" on public.feed_logs for update to authenticated
using (
  private.is_pet_household_member(pet_id)
  and ( private.is_pet_household_owner(pet_id)
        or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' ) )
)
with check (
  private.is_pet_household_member(pet_id)
  and ( private.is_pet_household_owner(pet_id)
        or ( logged_by = (select auth.uid())
             and created_at > now() - interval '24 hours'
             and logged_at >= now() - interval '24 hours' ) )
  and logged_at <= now()
);

drop policy "Owners can delete any feed log, contributors their own recent ones"
on public.feed_logs;

-- DELETE carried the same unguarded contributor branch as UPDATE, and DELETE
-- cannot have a `with check` to backstop it. A user with no household_members row
-- at all could issue an unfiltered `delete from feed_logs` -- which is exactly the
-- wire form of supabase.from('feed_logs').delete() with no .eq() -- and remove
-- their own recent rows from a household they had been removed from. Filtered
-- deletes were already blocked because Postgres layers the SELECT policy on when
-- the command reads columns; the unfiltered form reads none.
create policy "feed_logs_delete" on public.feed_logs for delete to authenticated
using (
  private.is_pet_household_member(pet_id)
  and ( private.is_pet_household_owner(pet_id)
        or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' ) )
);
