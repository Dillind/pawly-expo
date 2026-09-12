# Alert monitoring

Alert dispatch is watched by a **dead man's switch**. The sweep pings an outside service on every
healthy run, and that service pages when a ping stops arriving.

The inversion is the point. A failure report cannot be sent by a system that is down, and an alert
about broken alerts must not travel on the broken channel. Missing pings catch what error reporting
cannot: the job that never ran, the database that was unreachable, the sweep that hung.

## What pings, and when

`private.sweep_pending_alerts()` runs every five minutes (ADR 0038). At the end of each run it
calls `private.ping_healthcheck()` once:

| Outcome               | Path                    | Meaning                                                      |
| --------------------- | ----------------------- | ------------------------------------------------------------ |
| No alert abandoned    | the check URL           | Healthy. The body carries `reposted` and `abandoned` counts. |
| One or more abandoned | the check URL + `/fail` | An alert was given up on after six attempts or an hour.      |
| No ping at all        | —                       | The sweep, `pg_cron`, or the database is down.               |

**Only an abandoned alert pages.** A repost is the retry working, and paging on one would page on
every cold start — which is how a monitor teaches its reader to ignore it. The repost count still
rides along on the healthy ping, so a rising rate is visible without being loud.

## Setting it up

The service is [Healthchecks.io](https://healthchecks.io). The free tier covers twenty checks.

1. Create a check. Name it `crumpet alert dispatch`.
2. Set **Period** to 5 minutes and **Grace** to 15 minutes. One missed run is then a blip and two
   are a page.
3. Add the notification channels you want — email, Slack, or a phone push through their app.
4. Copy the ping URL. It looks like `https://hc-ping.com/<uuid>`.
5. Store it in Vault, beside the two dispatch secrets:

   ```sql
   select vault.create_secret('https://hc-ping.com/<uuid>', 'healthcheck_url');
   ```

6. Wait five minutes, then confirm the check has gone green in the Healthchecks dashboard.

**Without the secret every ping is skipped** and the sweep behaves exactly as before. That is the
deliberate default, so a fresh `supabase db reset` needs no account and QA is not obliged to have
one.

## Testing it

Force a `/fail` ping by abandoning a row by hand on QA:

```sql
update public.alerts set sent_at = null, dispatch_attempts = 6
where id = '<some alert id>';

select private.sweep_pending_alerts();
```

The check should flip to **Down** and the notification should arrive. Undo it afterwards.

To confirm the ping left the database at all:

```sql
select status_code, error_msg, content, created
from net._http_response order by created desc limit 5;
```

A `200` from `hc-ping.com` is a delivered ping. A `400` with `invalid url format` means the URL in
Vault is wrong.

## Why the ping is never checked

`private.ping_healthcheck()` fires and forgets. A monitoring call that can fail the thing it
monitors is worse than no monitoring — the sweep's job is to deliver alerts, and it must finish
that whether or not the ping lands. A ping that never arrives is itself the signal, and the outside
service is what reads it.
