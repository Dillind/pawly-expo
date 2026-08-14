-- Separate file from the enum values on purpose: Postgres refuses to use a new
-- enum value inside the transaction that added it, and each migration runs in
-- one. Splitting them is what makes a fresh `supabase db reset` work.
--
-- suppressed_reason is set on every row so dispatch_alert returns early and
-- nothing is pushed. #43 asks for a record without an interruption, and ADR
-- 0012 already had a word for that.

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
  where household_id = target_household_id and user_id = target_user_id;

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
  where household_id = target_household_id and user_id = target_user_id;

  insert into public.alerts (household_id, kind, subject_id, actor_id, suppressed_reason)
  values (
    target_household_id, 'member_role_changed', target_user_id, auth.uid(), 'membership_change'
  );

  return jsonb_build_object('status', 'changed');
end;
$$;

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
  where household_id = target_household_id and user_id = target_user_id;

  if current_role_value is null then
    return jsonb_build_object('status', 'not_a_member');
  end if;

  if current_role_value = 'owner' and private.owner_count(target_household_id) <= 1 then
    return jsonb_build_object('status', 'last_owner');
  end if;

  delete from public.household_members
  where household_id = target_household_id and user_id = target_user_id;

  insert into public.alerts (household_id, kind, subject_id, actor_id, suppressed_reason)
  values (target_household_id, 'member_removed', target_user_id, auth.uid(), 'membership_change');

  return jsonb_build_object('status', 'removed');
end;
$$;

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
  where household_id = target_household_id and user_id = auth.uid();

  if current_role_value is null then
    return jsonb_build_object('status', 'not_a_member');
  end if;

  if current_role_value = 'owner' and private.owner_count(target_household_id) <= 1 then
    return jsonb_build_object('status', 'last_owner');
  end if;

  delete from public.household_members
  where household_id = target_household_id and user_id = auth.uid();

  -- Written after the delete, so a leaver who is the subject is already gone
  -- from the household. The row belongs to the household, not to them.
  insert into public.alerts (household_id, kind, subject_id, actor_id, suppressed_reason)
  values (target_household_id, 'member_left', auth.uid(), auth.uid(), 'membership_change');

  return jsonb_build_object('status', 'left');
end;
$$;
