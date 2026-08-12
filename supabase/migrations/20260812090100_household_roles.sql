-- Roles do something.
--
-- household_members.role has existed since the first migration and nothing in
-- the app behaved differently because of it. That was survivable while every
-- household had one member. It stops being survivable the moment an invite
-- assigns a role, because then the inviter picks a word and nothing happens.
--
-- One rule underpins all of this: A HOUSEHOLD ALWAYS HAS AT LEAST ONE OWNER.
-- It answers three questions at once -- what if the last owner leaves, can an
-- owner demote themselves, can an owner demote another owner -- and each
-- becomes "yes, unless you would be the last one".
--
-- Enforced in these functions rather than in the UI. A UI-only guard is
-- bypassed by any direct call, and this is the invariant the whole membership
-- model rests on.

create or replace function private.owner_count(target_household_id uuid)
returns integer
language sql
security definer
set search_path = ''
stable
as $$
  select count(*)::integer
  from public.household_members
  where household_members.household_id = target_household_id
    and household_members.role = 'owner';
$$;

-- Change a member's role. Owner-only, and refuses to remove the last owner.
create or replace function public.set_member_role(
  target_household_id uuid,
  target_user_id uuid,
  new_role public.household_role
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role_value public.household_role;
begin
  if not private.is_household_owner(target_household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  select role into current_role_value
  from public.household_members
  where household_id = target_household_id
    and user_id = target_user_id;

  if current_role_value is null then
    return jsonb_build_object('status', 'not_a_member');
  end if;

  if current_role_value = new_role then
    return jsonb_build_object('status', 'unchanged');
  end if;

  if current_role_value = 'owner' and private.owner_count(target_household_id) <= 1 then
    return jsonb_build_object('status', 'last_owner');
  end if;

  update public.household_members
  set role = new_role
  where household_id = target_household_id
    and user_id = target_user_id;

  return jsonb_build_object('status', 'changed');
end;
$$;

-- Remove someone else. Owner-only, cannot remove the last owner, and cannot be
-- used on yourself -- leaving is its own function so the two read differently
-- at the call site and in the audit trail.
create or replace function public.remove_household_member(
  target_household_id uuid,
  target_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role_value public.household_role;
begin
  if not private.is_household_owner(target_household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  if target_user_id = auth.uid() then
    return jsonb_build_object('status', 'use_leave');
  end if;

  select role into current_role_value
  from public.household_members
  where household_id = target_household_id
    and user_id = target_user_id;

  if current_role_value is null then
    return jsonb_build_object('status', 'not_a_member');
  end if;

  if current_role_value = 'owner' and private.owner_count(target_household_id) <= 1 then
    return jsonb_build_object('status', 'last_owner');
  end if;

  delete from public.household_members
  where household_id = target_household_id
    and user_id = target_user_id;

  return jsonb_build_object('status', 'removed');
end;
$$;

-- Leave a household yourself. Any member may, except the last owner: there
-- would be nobody left who could rename it, add a pet or invite anyone.
create or replace function public.leave_household(target_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_role_value public.household_role;
begin
  select role into current_role_value
  from public.household_members
  where household_id = target_household_id
    and user_id = auth.uid();

  if current_role_value is null then
    return jsonb_build_object('status', 'not_a_member');
  end if;

  if current_role_value = 'owner' and private.owner_count(target_household_id) <= 1 then
    return jsonb_build_object('status', 'last_owner');
  end if;

  delete from public.household_members
  where household_id = target_household_id
    and user_id = auth.uid();

  return jsonb_build_object('status', 'left');
end;
$$;

revoke execute on function public.set_member_role(uuid, uuid, public.household_role)
  from public, anon;
revoke execute on function public.remove_household_member(uuid, uuid) from public, anon;
revoke execute on function public.leave_household(uuid) from public, anon;

grant execute on function public.set_member_role(uuid, uuid, public.household_role)
  to authenticated;
grant execute on function public.remove_household_member(uuid, uuid) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;
