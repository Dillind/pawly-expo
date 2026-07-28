-- pg_net gives the database an async HTTP client. The trigger fires and
-- returns immediately; the response lands in net._http_response later. That
-- asynchrony is the point -- log_feed must not wait on Expo.
--
-- pg_net installs its functions into the `net` schema, NOT `extensions.net`.
-- With `set search_path = ''` everything must be fully qualified, so this is
-- net.http_post.
--
-- Requires two Vault secrets, created by hand (they must never be committed):
--   select vault.create_secret('<random>', 'alert_dispatch_secret');
--   select vault.create_secret('https://<ref>.supabase.co/functions/v1/send-alerts',
--                              'alert_function_url');
-- The same random value must also be set as the ALERT_DISPATCH_SECRET
-- function secret, or every dispatch returns 401.

create extension if not exists pg_net;

create or replace function public.dispatch_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  dispatch_secret text;
begin
  -- A suppressed alert is a record, not a delivery. Never dispatch it.
  if new.suppressed_reason is not null then
    return new;
  end if;

  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'alert_function_url';

  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets where name = 'alert_dispatch_secret';

  if function_url is null or dispatch_secret is null then
    -- Do not fail the feed log because notifications are misconfigured. The
    -- row stays pending with an explanation, and alerts_pending_idx finds it.
    update public.alerts
    set error = 'dispatch skipped: vault secrets missing'
    where id = new.id;
    return new;
  end if;

  -- Only the alert id travels. The Edge Function re-reads the row with the
  -- service role rather than trusting a payload -- the trigger's job is to say
  -- "something is waiting", not to describe it.
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alert-secret', dispatch_secret
    ),
    body := jsonb_build_object('alert_id', new.id),
    timeout_milliseconds := 5000
  );

  return new;
end $$;

create trigger alerts_dispatch
after insert on public.alerts
for each row
execute function public.dispatch_alert();
