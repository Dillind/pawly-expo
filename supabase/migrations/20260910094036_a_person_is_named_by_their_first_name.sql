-- The user-side Username goes. A person is named by their first name.
--
-- The handle moves to the Household (CRU-126). Two handles, one on each, means
-- two unique namespaces and no way for anyone to know which one to hand over.
-- See ADR 0037.
--
-- The trigger is rewritten FIRST. It inserts `username` today, so dropping the
-- column before rewriting it would break every signup.

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

  insert into public.users (id, first_name, last_name)
  values (new.id, resolved_first, resolved_last);

  if new.email is not null then
    perform private.resolve_pending_invites(new.id, new.email);
  end if;

  return new;
end;
$$;

-- The suggestion logic is not lost with these. It stays readable in
-- 20260908130000_username_suggestions_offer_nothing_for_a_thin_stem.sql, and
-- the Household handle wants the same "stem is too thin" rule.
drop function if exists public.username_suggestions(text, int);
drop function if exists public.username_available(text);
drop function if exists private.seed_username(text);

drop index if exists public.users_username_unique;

alter table public.users
  drop constraint if exists users_username_not_reserved,
  drop constraint if exists users_username_format,
  drop column if exists username;
