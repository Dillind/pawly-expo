-- Invites. Supersedes the link half of ADR 0003; see ADR 0020.
--
-- Delivery is entirely in-app -- Crumpet sends no email. The address is a
-- LOOKUP KEY, not a delivery channel: an invite is created against it either
-- way, so there is never a "no such user" answer to leak. That is what removes
-- the account-enumeration oracle rather than merely mitigating it.
--
-- An invite keyed to the email rather than a user id is also what lets someone
-- without an account be invited at all: the row waits, and resolve_pending_
-- invites attaches it the moment they sign up with that address.

create type public.invite_status as enum ('pending', 'accepted', 'declined', 'revoked');

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  invited_by uuid references public.users (id) on delete set null,
  role public.household_role not null default 'contributor',
  -- Lowercased on write. Two addresses differing only in case are one person.
  email text not null,
  -- Resolved at send time when an account already exists, and by
  -- resolve_pending_invites when one is created later. Null means the invite
  -- is reachable only by its code.
  invitee_user_id uuid references auth.users (id) on delete set null,
  -- Short, human-typeable, and what the QR encodes. Ambiguous characters are
  -- left out of the alphabet -- this gets read aloud and typed by hand.
  code text not null unique,
  status public.invite_status not null default 'pending',
  expires_at timestamptz not null default now() + interval '72 hours',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- One live invite per address per household. A second "invite" of someone
-- already invited should find the existing row, not stack up rows that all
-- resolve to the same membership.
create unique index household_invites_one_pending
  on public.household_invites (household_id, email)
  where status = 'pending';

create index household_invites_invitee on public.household_invites (invitee_user_id)
  where status = 'pending';

alter table public.household_invites enable row level security;

-- No INSERT/UPDATE/DELETE policy anywhere: every write goes through the RPCs
-- below, which is what enforces owner-only creation and the expiry rules.
--
-- SELECT is deliberately NOT scoped to household membership. An invitee is by
-- definition not a member yet, so a membership-scoped policy would hide the one
-- row they need to see.
create policy "Owners see their household's invites, invitees see their own"
  on public.household_invites
  for select
  to authenticated
  using (
    private.is_household_owner(household_id)
    or invitee_user_id = auth.uid()
  );

grant select on public.household_invites to authenticated;

-- Excludes 0/O/1/I/L. A code is read aloud and typed by hand.
create or replace function private.generate_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', floor(random() * 31)::integer + 1, 1),
    ''
  )
  from generate_series(1, 8);
$$;

create or replace function public.create_household_invite(
  target_household_id uuid,
  invitee_email text,
  invitee_role public.household_role
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalised_email text := lower(btrim(invitee_email));
  existing_user_id uuid;
  new_code text;
  existing public.household_invites;
begin
  if not private.is_household_owner(target_household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  select id into existing_user_id from auth.users where lower(email) = normalised_email;

  if existing_user_id is not null and exists (
    select 1 from public.household_members
    where household_id = target_household_id and user_id = existing_user_id
  ) then
    return jsonb_build_object('status', 'already_member');
  end if;

  -- Re-offering an invite that is still live returns the existing one rather
  -- than failing. The owner's intent is the same either way.
  select * into existing
  from public.household_invites
  where household_id = target_household_id
    and email = normalised_email
    and status = 'pending'
    and expires_at > now();

  if found then
    return jsonb_build_object('status', 'created', 'code', existing.code, 'id', existing.id);
  end if;

  -- Only an EXPIRED pending row can reach here -- a live one returned above --
  -- but the expiry clause is stated rather than inferred, because the partial
  -- unique index depends on this clearing the right rows.
  update public.household_invites
  set status = 'revoked'
  where household_id = target_household_id
    and email = normalised_email
    and status = 'pending'
    and expires_at <= now();

  loop
    new_code := private.generate_invite_code();
    exit when not exists (select 1 from public.household_invites where code = new_code);
  end loop;

  insert into public.household_invites
    (household_id, invited_by, role, email, invitee_user_id, code)
  values
    (target_household_id, auth.uid(), invitee_role, normalised_email, existing_user_id, new_code)
  returning * into existing;

  return jsonb_build_object('status', 'created', 'code', existing.code, 'id', existing.id);
end;
$$;

create or replace function public.revoke_household_invite(invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.household_invites;
begin
  select * into target from public.household_invites where id = invite_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if not private.is_household_owner(target.household_id) then
    return jsonb_build_object('status', 'not_owner');
  end if;

  update public.household_invites set status = 'revoked' where id = invite_id;

  return jsonb_build_object('status', 'revoked');
end;
$$;

-- Redeem by code (typed or scanned) or by id (tapped in the inbox). Returns a
-- status rather than throwing: expired / revoked / already_used /
-- already_member each need different wording.
create or replace function public.redeem_household_invite(
  invite_code text default null,
  invite_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.household_invites;
begin
  if auth.uid() is null then
    return jsonb_build_object('status', 'not_signed_in');
  end if;

  select * into target
  from public.household_invites
  where (invite_id is not null and id = invite_id)
     or (invite_code is not null and code = upper(btrim(invite_code)));

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

  if exists (
    select 1 from public.household_members
    where household_id = target.household_id and user_id = auth.uid()
  ) then
    update public.household_invites set status = 'accepted', accepted_at = now()
    where id = target.id;

    return jsonb_build_object('status', 'already_member');
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target.household_id, auth.uid(), target.role);

  update public.household_invites
  set status = 'accepted', accepted_at = now(), invitee_user_id = auth.uid()
  where id = target.id;

  return jsonb_build_object(
    'status', 'joined',
    'household_id', target.household_id,
    'role', target.role
  );
end;
$$;

create or replace function public.decline_household_invite(invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.household_invites
  set status = 'declined'
  where id = invite_id
    and invitee_user_id = auth.uid()
    and status = 'pending';

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'declined');
end;
$$;

-- Called from handle_new_user: an invite written before the account existed is
-- attached to it the moment they sign up with that address.
create or replace function private.resolve_pending_invites(new_user_id uuid, new_email text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.household_invites
  set invitee_user_id = new_user_id
  where email = lower(btrim(new_email))
    and invitee_user_id is null
    and status = 'pending';
$$;

-- Extends the existing trigger rather than adding a second one on auth.users:
-- two triggers on the same insert have no defined order between them, and this
-- one must run after public.users exists.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );

  if new.email is not null then
    perform private.resolve_pending_invites(new.id, new.email);
  end if;

  return new;
end;
$$;

revoke execute on function public.create_household_invite(uuid, text, public.household_role)
  from public, anon;
revoke execute on function public.revoke_household_invite(uuid) from public, anon;
revoke execute on function public.redeem_household_invite(text, uuid) from public, anon;
revoke execute on function public.decline_household_invite(uuid) from public, anon;

grant execute on function public.create_household_invite(uuid, text, public.household_role)
  to authenticated;
grant execute on function public.revoke_household_invite(uuid) to authenticated;
grant execute on function public.redeem_household_invite(text, uuid) to authenticated;
grant execute on function public.decline_household_invite(uuid) to authenticated;
