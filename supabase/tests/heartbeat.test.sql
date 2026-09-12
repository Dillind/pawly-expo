\set QUIET on
\set ON_ERROR_STOP on
\pset pager off

-- The heartbeat's failure isolation, which is the part most likely to be
-- deleted by someone who reads it as a defensive nicety. It is not. Without the
-- exception block a malformed healthcheck_url aborts sweep_pending_alerts and
-- rolls back every repost and terminal stamp it had just made -- on every run,
-- forever, because the bad secret is still there next time. See CRU-140.
--
-- The shim in local-shim.sql always succeeds, so these tests replace
-- net.http_post with versions that raise and that record, exactly as the real
-- extension behaves.

create or replace function pg_temp.check(label text, got anyelement, want anyelement)
returns void language plpgsql as $$
begin
  if got is not distinct from want then
    raise notice 'PASS  %', label;
  else
    raise exception 'FAIL  % -- got %, want %', label, got, want;
  end if;
end $$;

create table pg_temp.pinged (seq serial primary key, url text);

-- Records instead of sending. `net` is the shim's schema, so replacing the
-- function here is what the sweep will call.
create or replace function net.http_post(
  url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000
) returns bigint language plpgsql as $$
begin
  insert into pg_temp.pinged (url) values (url);
  return 1::bigint;
end $$;

-- ------------------------------------------------------------- no secret set
-- Re-runnable against a database that already has one, rather than assuming a
-- reset. A test that only passes on the first run is a test that gets skipped.
delete from vault.decrypted_secrets where name = 'healthcheck_url';
delete from pg_temp.pinged;
delete from public.alerts where id in (
  'cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

select pg_temp.check('no healthcheck_url means no ping',
  (select count(*)::int from pg_temp.pinged), 0);
select pg_temp.check('the sweep runs with no healthcheck_url',
  private.sweep_pending_alerts(), 0);
select pg_temp.check('still no ping',
  (select count(*)::int from pg_temp.pinged), 0);

-- ----------------------------------------------------------- the healthy path
insert into vault.decrypted_secrets (name, decrypted_secret)
  values ('healthcheck_url', 'http://localhost/hc/abc');

select private.sweep_pending_alerts();
select pg_temp.check('a clean run pings the bare check url',
  (select url from pg_temp.pinged order by seq desc limit 1), 'http://localhost/hc/abc');

-- --------------------------------------------------------- the abandoned path
-- One alert past the attempt cap. The sweep must close it AND take /fail.
insert into auth.users (id) values ('44444444-4444-4444-4444-444444444444')
  on conflict (id) do nothing;
insert into public.households (id, name, timezone)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Heartbeat Household', 'Australia/Melbourne')
  on conflict (id) do nothing;
insert into public.alerts (id, household_id, kind, subject_id, dispatch_attempts)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc',
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'feed_logged',
          'cccccccc-cccc-cccc-cccc-cccccccccccc', 6);

select private.sweep_pending_alerts();

select pg_temp.check('an abandoned alert takes the fail path',
  (select url from pg_temp.pinged order by seq desc limit 1), 'http://localhost/hc/abc/fail');
select pg_temp.check('an abandoned alert is closed, not left pending',
  (select sent_at is not null from public.alerts
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'), true);
select pg_temp.check('and says how many attempts it took',
  (select error from public.alerts where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'dispatch failed after 6 attempts');

-- ------------------------------------------------- a ping that raises, the point
-- A malformed URL is what pg_net raises on:
--   invalid URL "not a url at all": Malformed input to a URL function
create or replace function net.http_post(
  url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000
) returns bigint language plpgsql as $$
begin
  raise exception 'invalid URL "%": Malformed input to a URL function', url;
end $$;

insert into public.alerts (id, household_id, kind, subject_id, dispatch_attempts)
  values ('dddddddd-dddd-dddd-dddd-dddddddddddd',
          'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'feed_logged',
          'dddddddd-dddd-dddd-dddd-dddddddddddd', 6);

-- The call itself must not raise. If the exception block is ever removed this
-- line fails the file, which is the whole reason the test exists.
select pg_temp.check('a raising ping does not abort the sweep',
  private.sweep_pending_alerts(), 0);

-- And the work must have survived. A rollback would leave this one pending.
select pg_temp.check('the work before a raising ping is committed, not rolled back',
  (select sent_at is not null from public.alerts
    where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'), true);
