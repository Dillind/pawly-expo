-- A dispatch that fails is retried, and a dispatch that can never succeed is
-- stamped. Before this, neither happened: pg_net posted once, and a call that
-- timed out left the row pending forever with sent_at, error and
-- suppressed_reason all null. Thirteen alerts were lost that way in two weeks.
--
-- The trigger post stays. It is what makes the common case immediate; the
-- sweep is the net under it, not a replacement for it.

alter table public.alerts
  add column dispatch_attempts smallint not null default 0,
  add column last_dispatch_at timestamptz;

-- Every row that already exists was posted once by the trigger. Left at zero
-- they would be closed as "failed after 0 attempts", which is not what
-- happened to them.
update public.alerts set dispatch_attempts = 1;

comment on column public.alerts.dispatch_attempts is
  'Posts made to the Edge Function, including the one the insert trigger makes.';

-- The sweep reads the queue by age and skips rows posted a moment ago, so it
-- wants last_dispatch_at in the index rather than created_at alone.
drop index if exists public.alerts_pending_idx;
create index alerts_pending_idx
  on public.alerts (created_at, last_dispatch_at)
  where sent_at is null and suppressed_reason is null;

-- One place owns the Vault read and the POST, because the trigger and the
-- sweep must send the identical request. Two copies drift.
create function private.post_alert(alert_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  dispatch_secret text;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'alert_function_url';

  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets where name = 'alert_dispatch_secret';

  if function_url is null or dispatch_secret is null then
    return false;
  end if;

  -- 20 seconds, not 5. A cold start imports npm:@supabase/supabase-js before
  -- the handler runs, which measured 5.5 seconds in production on 2026-09-12
  -- and lost the alert. A warm call answers in about 1.5 seconds, so this
  -- ceiling costs nothing in the normal case.
  perform net.http_post(
    url := function_url,
    headers := pg_catalog.jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alert-secret', dispatch_secret
    ),
    body := pg_catalog.jsonb_build_object('alert_id', alert_id),
    timeout_milliseconds := 20000
  );

  -- The row is marked before the response exists, because pg_net is async and
  -- the response never comes back to this transaction. A post that fails is
  -- therefore indistinguishable from one that succeeds HERE -- the Edge
  -- Function stamps sent_at, and a row still pending at the next sweep is the
  -- only evidence of failure the database ever gets.
  update public.alerts
  set dispatch_attempts = public.alerts.dispatch_attempts + 1,
      last_dispatch_at = pg_catalog.now()
  where id = alert_id;

  return true;
end $$;

revoke execute on function private.post_alert(uuid) from public;
revoke execute on function private.post_alert(uuid) from anon, authenticated;

create or replace function public.dispatch_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A suppressed alert is a record, not a delivery. Never dispatch it.
  if new.suppressed_reason is not null then
    return new;
  end if;

  -- Do not fail the feed log because notifications are misconfigured. The row
  -- stays pending with an explanation, and the sweep leaves it alone once the
  -- attempt cap is reached.
  if not private.post_alert(new.id) then
    update public.alerts
    set error = 'dispatch skipped: vault secrets missing'
    where id = new.id;
  end if;

  return new;
end $$;

-- The net under the trigger. Reposts anything still pending, and closes the
-- rows that can never be sent so the queue stays a queue rather than a
-- graveyard.
create function private.sweep_pending_alerts()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Long enough that a slow-but-working dispatch is never posted twice. The
  -- Edge Function stamps sent_at as its last act, so a retry inside its own
  -- run would send the same push again.
  retry_after constant interval := interval '3 minutes';
  -- Six attempts over about twenty minutes. Past that the failure is not
  -- transient, and a nudge that arrives twenty minutes late is not a nudge.
  max_attempts constant smallint := 6;
  -- Nothing is worth sending an hour after it was queued. The longest Lead
  -- Time is sixty minutes, so this can never close a row that is still early.
  give_up_after constant interval := interval '1 hour';
  reposted integer := 0;
  pending record;
begin
  -- A nudge is only a nudge before the feed is due. A retry can land after that
  -- instant, and "coming up in 15 minutes" about a feed that was due ten
  -- minutes ago is worse than silence -- the missed-feed sweep is what speaks
  -- for a feed that has passed. Suppressed, not failed: nothing broke.
  update public.alerts
  set suppressed_reason = 'too late to nudge'
  where sent_at is null
    and suppressed_reason is null
    and kind = 'feed_due'
    and subject_at <= pg_catalog.now();

  -- Terminal first, so a row that has run out of road is never reposted on the
  -- same run. sent_at is stamped deliberately: it means "resolved", not
  -- "delivered", and `error` is what tells the two apart -- the same contract
  -- the Edge Function already uses for 'no recipients'.
  update public.alerts
  set sent_at = pg_catalog.now(),
      error = 'dispatch failed after ' || public.alerts.dispatch_attempts || ' attempts'
  where sent_at is null
    and suppressed_reason is null
    and (
      public.alerts.dispatch_attempts >= max_attempts
      or public.alerts.created_at < pg_catalog.now() - give_up_after
    );

  for pending in
    select alerts.id
    from public.alerts
    where alerts.sent_at is null
      and alerts.suppressed_reason is null
      and (
        alerts.last_dispatch_at is null
        or alerts.last_dispatch_at < pg_catalog.now() - retry_after
      )
      and alerts.created_at < pg_catalog.now() - retry_after
    order by alerts.created_at
  loop
    -- A broken Vault leaves the row pending with its reason already written by
    -- the trigger. Reposting it every five minutes would only burn attempts.
    continue when not private.post_alert(pending.id);

    update public.alerts
    set error = 'dispatch retried'
    where id = pending.id;

    reposted := reposted + 1;
  end loop;

  return reposted;
end $$;

revoke execute on function private.sweep_pending_alerts() from public;
revoke execute on function private.sweep_pending_alerts() from anon, authenticated;

-- Five minutes. The retry window is three, so a failed alert waits at most
-- eight minutes for its second attempt.
--
-- Unschedule first so this stays re-runnable against a hand-created job.
select cron.unschedule('sweep-pending-alerts')
where exists (select 1 from cron.job where jobname = 'sweep-pending-alerts');

select cron.schedule(
  'sweep-pending-alerts',
  '*/5 * * * *',
  $$select private.sweep_pending_alerts()$$
);
