-- Usernames: a unique handle for every Member.
--
-- Two things need this at once. The @name reply prefix in comments needs a
-- stable, unique handle rather than a first name, and the push copy rewrite
-- names the person who acted on a single line.
--
-- The column is nullable for the same reason first_name is: private.handle_new_user
-- runs inside the signup transaction, and a NOT NULL column plus any failure
-- to produce a value would fail the signup itself.

alter table public.users
  add column username text;

-- Lowercase only, so the app never has to decide whether Ben and ben are the
-- same person. Starts with a letter, 3 to 20 characters.
alter table public.users
  add constraint users_username_format
  check (username is null or username ~ '^[a-z][a-z0-9_]{2,19}$');

-- Names the app itself might want to speak with. Kept in the constraint rather
-- than a table: it is a handful of words that change about once a year, and a
-- table would need its own RLS for no benefit.
alter table public.users
  add constraint users_username_not_reserved
  check (username is null or username not in ('admin', 'crumpet', 'support', 'owner', 'help'));

-- lower() rather than the bare column. The format constraint already forbids
-- uppercase, so this is belt and braces -- but it is the index that decides
-- whether two handles collide, and it should not depend on a check constraint
-- staying exactly as it is today.
create unique index users_username_unique on public.users (lower(username));

-- Seeds a handle from whatever name we have.
--
-- Lowercase the first name, strip everything outside a-z0-9, drop leading
-- digits so the result can start with a letter, and fall back to `member` when
-- nothing survives -- a null first name, an emoji, a name in a non-Latin
-- script. Then four random characters from a 36-symbol alphabet.
--
-- 36^4 is 1.7 million combinations per stem, so a collision is rarer than a
-- failed signup. There is deliberately no retry loop: retrying inside the
-- signup trigger is a way to make signup slow, or fail, and the caller below
-- handles a collision by writing no handle at all.
create function private.seed_username(source text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  alphabet constant text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  stem text;
  suffix text := '';
begin
  stem := regexp_replace(lower(coalesce(source, '')), '[^a-z0-9]', '', 'g');
  stem := regexp_replace(stem, '^[0-9]+', '');
  stem := left(stem, 16);

  if stem = '' then
    stem := 'member';
  end if;

  for _ in 1..4 loop
    suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;

  return stem || suffix;
end;
$$;

-- Is this handle free?
--
-- SECURITY DEFINER because a signed-out user filling in the signup form has to
-- be able to ask, and public.users is behind RLS that only shows fellow
-- household members. It returns a boolean and nothing else, so it cannot be
-- used to read anyone's handle -- only to confirm a guess, which is what a
-- unique namespace exposes anyway.
--
-- The unique index is the real guard. This exists so the answer arrives before
-- the user taps Save. It answers "free to take", so a reserved word is not
-- available; format is the client's Zod schema to enforce, and an invalid
-- string is reported unavailable rather than accepted.
create function public.username_available(candidate text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    candidate is not null
    and candidate ~ '^[a-z][a-z0-9_]{2,19}$'
    and candidate not in ('admin', 'crumpet', 'support', 'owner', 'help')
    and not exists (
      select 1 from public.users where lower(users.username) = lower(candidate)
    );
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- Every existing user gets a handle. Row by row, because seed_username is
-- random per call and a set-based update would still need the loop to react to
-- a collision.
do $$
declare
  person record;
begin
  for person in select id, first_name from public.users where username is null loop
    begin
      update public.users
      set username = private.seed_username(person.first_name)
      where id = person.id;
    exception when unique_violation then
      -- Leave it null. The Profile screen asks for one, and username_available
      -- is there to help them pick.
      null;
    end;
  end loop;
end;
$$;

-- Signup seeds the handle too.
--
-- The exception block is the whole point. A unique_violation here would roll
-- back the signup, and a handle is not worth an account -- so a collision
-- writes no handle and the Profile screen asks for one later.
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

  -- A handle the user typed on the signup form wins over a seeded one.
  resolved_username := nullif(trim(lower(meta ->> 'username')), '');

  if resolved_username is null then
    resolved_username := private.seed_username(resolved_first);
  end if;

  begin
    insert into public.users (id, first_name, last_name, username)
    values (new.id, resolved_first, resolved_last, resolved_username);
  exception when unique_violation or check_violation then
    insert into public.users (id, first_name, last_name)
    values (new.id, resolved_first, resolved_last);
  end;

  if new.email is not null then
    perform private.resolve_pending_invites(new.id, new.email);
  end if;

  return new;
end;
$$;
