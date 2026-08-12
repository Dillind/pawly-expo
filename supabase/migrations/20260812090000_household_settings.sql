-- Household settings: an owner may rename their household and change its
-- timezone and grace window.
--
-- households had no UPDATE policy at all until now -- the name was written once
-- by create_household_and_pet and could never change, so every household in the
-- database is called "<Name>'s Household". That reads badly in the post
-- composer, and once a user can belong to several it stops being cosmetic: the
-- switcher is navigated by name.

-- 30 characters, enforced here as well as in the Zod schema. "Dylan and Lisa's
-- Household" is 26, so a shared name fits with room. The constraint is the half
-- that survives a caller who is not the app.
alter table public.households
  add constraint households_name_length check (char_length(btrim(name)) between 1 and 30);

create policy "Owners can update their household"
  on public.households
  for update
  to authenticated
  using (private.is_household_owner(id))
  with check (private.is_household_owner(id));

-- Column-level, matching household_members. A column not named here is
-- invisible to writes and fails SILENTLY -- the write reports success and the
-- value reverts on the next refetch. Anything added later must be added here
-- too.
grant update (name, timezone, grace_window_minutes) on public.households to authenticated;
