-- Being told your own role changed is useful. Being told someone else's is
-- office politics, so a role change becomes an Addressed Alert.
--
-- member_removed and member_left stay Household News. Who is in the Household
-- is everyone's business, and being removed is something you can legitimately
-- find out about someone else.

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

  insert into public.alerts
    (household_id, kind, subject_id, actor_id, recipient_id, suppressed_reason)
  values (
    target_household_id,
    'member_role_changed',
    target_user_id,
    auth.uid(),
    target_user_id,
    'membership_change'
  );

  return jsonb_build_object('status', 'changed');
end;
$$;

-- Joined rather than set outright: subject_id carries no foreign key, so a row
-- naming a deleted user would otherwise fail recipient_id's.
update public.alerts a
set recipient_id = u.id
from auth.users u
where a.kind = 'member_role_changed'
  and a.recipient_id is null
  and u.id = a.subject_id;

-- What the backfill cannot reach is a role change whose subject has since
-- deleted their account. Left alone it is a null recipient, which reads as
-- household news -- the exact inversion of the decision above, and the copy
-- below now says "your role" to whoever sees it. The one person it was for is
-- gone, so the row has no reader left. This is not the feed-log case: it is not
-- a delivery record and nothing consults it.
delete from public.alerts
where kind = 'member_role_changed' and recipient_id is null;

-- Stated for the same reason the post_liked check is: the RPC being correct is
-- not the same as the table refusing the row.
alter table public.alerts
  add constraint alerts_role_change_has_recipient
  check (kind <> 'member_role_changed' or recipient_id is not null);
