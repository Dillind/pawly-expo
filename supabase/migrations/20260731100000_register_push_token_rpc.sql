-- Push token registration moves to an RPC, because the client upsert could
-- never have worked.
--
-- PostgREST compiles `upsert(..., { onConflict: 'token' })` to
-- INSERT ... ON CONFLICT DO UPDATE, and Postgres requires SELECT privilege on
-- the target table for that form -- the check is static, applied whether or not
-- a row actually conflicts. 20260728090000 revoked SELECT deliberately, so
-- every registration returned 403 and the caller's catch swallowed it: no
-- rows, no error, nothing to debug from.
--
-- Granting SELECT back would give every client read access to the whole token
-- table and reverse that migration's stated intent. A security definer
-- function needs no table grants at all, so the revoke stands.

create or replace function public.register_push_token(
  target_token text,
  target_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'register_push_token requires an authenticated caller';
  end if;

  if target_token is null or length(trim(target_token)) = 0 then
    raise exception 'register_push_token requires a token';
  end if;

  if target_platform not in ('ios', 'android') then
    raise exception 'unsupported platform: %', target_platform;
  end if;

  -- user_id comes from auth.uid(), never from a parameter, so security definer
  -- cannot be turned into a way to register a token against another account.
  --
  -- Reassigning on conflict is deliberate, and matches the table's own reason
  -- for keying on the token: two accounts on one phone share one token, and
  -- the row has to follow whoever is signed in, or the previous user's
  -- household alerts keep arriving in the new user's session.
  insert into public.push_tokens (token, user_id, platform, last_seen_at)
  values (target_token, caller, target_platform, now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        last_seen_at = excluded.last_seen_at;
end $$;

revoke execute on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
