-- Signup stops inventing a handle.
--
-- Onboarding now asks for one, and the gate that holds a Member there reads
-- `username is null`. A seeded handle is not null, so seeding would mean nobody
-- is ever asked -- and the seed only ever produced a `member` handle for an email
-- signup anyway, because AuthService.signUp writes the name after the trigger
-- has already run.
--
-- The metadata key stays. Nothing sends it today, but it is the hook that lets
-- a signup form carry a chosen handle without another migration.
--
-- private.seed_username is left in place: the CRU-125 backfill used it, and
-- dropping it would rewrite history for no gain.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_first text;
  resolved_last text;
  resolved_username text;
  whole_name text;
begin
  resolved_first := nullif(trim(coalesce(meta ->> 'first_name', meta ->> 'given_name')), '');
  resolved_last := nullif(trim(coalesce(meta ->> 'last_name', meta ->> 'family_name')), '');

  if resolved_first is null then
    whole_name := nullif(trim(coalesce(meta ->> 'full_name', meta ->> 'name')), '');

    if whole_name is not null then
      resolved_first := split_part(whole_name, ' ', 1);
      resolved_last := coalesce(
        resolved_last,
        nullif(trim(substr(whole_name, length(split_part(whole_name, ' ', 1)) + 1)), '')
      );
    end if;
  end if;

  resolved_username := nullif(trim(lower(meta ->> 'username')), '');

  -- Settle the handle BEFORE the insert, so the insert has nothing to fall back
  -- from. A taken or malformed handle costs the handle, never the account.
  if resolved_username is not null and not public.username_available(resolved_username) then
    resolved_username := null;
  end if;

  insert into public.users (id, first_name, last_name, username)
  values (new.id, resolved_first, resolved_last, resolved_username);

  if new.email is not null then
    perform private.resolve_pending_invites(new.id, new.email);
  end if;

  return new;
end;
$$;
