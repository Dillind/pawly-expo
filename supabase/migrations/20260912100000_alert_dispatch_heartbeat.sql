-- Nothing outside the database knew when alert dispatch broke. CRU-139 made a
-- failure durable in alerts.error, which is an improvement on silence, but it
-- still waits for a human to run a query. The 12:00 pm feed of 2026-09-12 was
-- found because somebody noticed their phone was quiet.
--
-- This is a dead man's switch. The sweep pings an outside service on every
-- healthy run, and that service pages when a ping stops arriving. The
-- inversion is the point: a failure report cannot be sent by a system that is
-- down, and an alert about broken alerts must not travel on the broken
-- channel. Missing pings catch what error reporting cannot -- the job that
-- never ran, the database that was unreachable, the sweep that hung.
--
-- Requires one more Vault secret, created by hand alongside the other two:
--   select vault.create_secret('https://hc-ping.com/<uuid>', 'healthcheck_url');
-- Absent, every ping is skipped and the sweep behaves exactly as before. The
-- check itself wants a 5-minute period and a 5-minute grace, so one missed run
-- is a blip and two are a page.

create function private.ping_healthcheck(path text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  healthcheck_url text;
begin
  select decrypted_secret into healthcheck_url
  from vault.decrypted_secrets where name = 'healthcheck_url';

  if healthcheck_url is null then
    return;
  end if;

  -- Fire and forget, and deliberately not checked. A monitoring call that can
  -- fail the thing it monitors is worse than no monitoring: the sweep's job is
  -- to deliver alerts, and it must finish that whether or not the ping lands.
  -- A ping that never arrives is the signal, and the outside service is what
  -- reads it.
  --
  -- The exception block is what makes that true rather than merely intended.
  -- net.http_post validates its arguments and raises on a malformed URL, and
  -- the caller runs it in the same transaction as the reposts. Unguarded, a
  -- typo in the Vault secret would abort the sweep, roll back every repost and
  -- every terminal stamp it had just made, and fail the cron run -- on every
  -- run, forever. The monitor would have become the outage.
  --
  -- `when others` is deliberately wide, as in sweep_feed_due: whatever breaks
  -- in here, alert dispatch must still happen.
  begin
    perform net.http_post(
      url := healthcheck_url || path,
      headers := pg_catalog.jsonb_build_object('Content-Type', 'application/json'),
      body := payload,
      timeout_milliseconds := 5000
    );
  exception
    when others then
      raise warning 'healthcheck ping failed: %', sqlerrm;
  end;
end $$;

revoke execute on function private.ping_healthcheck(text, jsonb) from public;
revoke execute on function private.ping_healthcheck(text, jsonb) from anon, authenticated;

create or replace function private.sweep_pending_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  retry_after constant interval := interval '3 minutes';
  max_attempts constant smallint := 6;
  give_up_after constant interval := interval '1 hour';
  reposted integer := 0;
  abandoned integer := 0;
  pending record;
begin
  update public.alerts
  set suppressed_reason = 'too late to nudge'
  where sent_at is null
    and suppressed_reason is null
    and kind = 'feed_due'
    and subject_at <= pg_catalog.now();

  update public.alerts
  set sent_at = pg_catalog.now(),
      error = 'dispatch failed after ' || public.alerts.dispatch_attempts || ' attempts'
  where sent_at is null
    and suppressed_reason is null
    and (
      public.alerts.dispatch_attempts >= max_attempts
      or public.alerts.created_at < pg_catalog.now() - give_up_after
    );

  get diagnostics abandoned = row_count;

  -- `for update skip locked` is what makes two overlapping runs safe. pg_cron
  -- starts a run on the schedule whether or not the last one has finished, and
  -- without the lock both would claim the same row and push it twice.
  --
  -- It also closes the staler race. The loop body posts over the network, so a
  -- plain snapshot can name a row that the Edge Function stamped sent_at on
  -- while the loop was still walking. Under READ COMMITTED, `for update`
  -- re-checks the predicate against the row it just locked, so a row resolved
  -- mid-run drops out instead of being reposted and relabelled.
  for pending in
    select alerts.id
    from public.alerts as alerts
    where alerts.sent_at is null
      and alerts.suppressed_reason is null
      and (
        alerts.last_dispatch_at is null
        or alerts.last_dispatch_at < pg_catalog.now() - retry_after
      )
      and alerts.created_at < pg_catalog.now() - retry_after
    order by alerts.created_at
    for update skip locked
  loop
    -- A broken Vault leaves the row pending with its reason already written by
    -- the trigger. Reposting it every five minutes would only burn attempts.
    continue when not private.post_alert(pending.id);

    -- `sent_at is null` again, because post_alert sends over the network and
    -- the Edge Function can resolve the row before this statement runs.
    -- Without it a delivered alert is relabelled as a retry.
    update public.alerts
    set error = 'dispatch retried'
    where id = pending.id and sent_at is null;

    reposted := reposted + 1;
  end loop;

  -- An abandoned alert is the only thing worth waking someone for. A repost is
  -- the retry working, and paging on one would page on every cold start --
  -- which is how a monitor teaches its reader to ignore it. The count still
  -- rides along on the healthy ping, so a rising repost rate is visible
  -- without being loud.
  perform private.ping_healthcheck(
    case when abandoned > 0 then '/fail' else '' end,
    pg_catalog.jsonb_build_object('reposted', reposted, 'abandoned', abandoned)
  );

  return reposted;
end $$;

revoke execute on function private.sweep_pending_alerts() from public;
revoke execute on function private.sweep_pending_alerts() from anon, authenticated;
