-- Read an invite without accepting it, so a scanned QR can say WHICH household
-- it is offering before anyone commits.
--
-- The select policy on household_invites covers owners and the named invitee.
-- Someone who scanned a code is usually neither, so they could not read the
-- household's name -- and a prompt that says "join a household?" without saying
-- which one is not a prompt worth showing.
--
-- security definer, and holding the code IS the authorisation. It returns only
-- what the prompt needs: the household's name and the role on offer. No member
-- list, no pets, no invitee email.

create or replace function public.preview_household_invite(invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.household_invites;
  household_name text;
begin
  select * into target
  from public.household_invites
  where code = upper(btrim(invite_code));

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if target.status = 'revoked' then
    return jsonb_build_object('status', 'revoked');
  end if;

  if target.status = 'accepted' then
    return jsonb_build_object('status', 'already_used');
  end if;

  if target.expires_at <= now() then
    return jsonb_build_object('status', 'expired');
  end if;

  if auth.uid() is not null and exists (
    select 1 from public.household_members
    where household_id = target.household_id and user_id = auth.uid()
  ) then
    return jsonb_build_object('status', 'already_member');
  end if;

  select name into household_name from public.households where id = target.household_id;

  return jsonb_build_object(
    'status', 'valid',
    'household_name', household_name,
    'role', target.role
  );
end;
$$;

revoke execute on function public.preview_household_invite(text) from public, anon;
grant execute on function public.preview_household_invite(text) to authenticated;
