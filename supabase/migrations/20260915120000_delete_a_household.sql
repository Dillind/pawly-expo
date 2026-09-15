-- Deleting a Household destroys data that belongs to other people, so it is an
-- RPC rather than a DELETE policy on `households`. A policy can say who may
-- delete; it cannot require that the Owner typed the name.
--
-- Every dependent table already cascades from `households` -- alerts,
-- household_follows, household_invites, household_members, occasions, pets,
-- posts -- so the row delete at the end is the whole of the row cleanup.
--
-- It does NOT take the Storage objects with it, and it cannot. See KNOWLEDGE.

create or replace function public.delete_household(
  target_household_id uuid,
  confirmed_name text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  household_name text;
begin
  if not private.is_household_owner(target_household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  select name into household_name
  from public.households
  where id = target_household_id;

  if household_name is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  -- The same gate the Danger zone screen draws, repeated here because the
  -- screen is not the only possible caller. Trimmed but not case-folded: the
  -- point of the exercise is that the Owner reads the name and copies it.
  if btrim(confirmed_name) <> household_name then
    return jsonb_build_object('status', 'name_mismatch');
  end if;

  delete from public.households where id = target_household_id;

  return jsonb_build_object('status', 'deleted');
end;
$$;

revoke execute on function public.delete_household(uuid, text) from public, anon;
grant execute on function public.delete_household(uuid, text) to authenticated;
