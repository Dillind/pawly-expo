# 0038 — Alert dispatch is at-least-once, with a sweep under the trigger

- **Status:** Accepted
- **Date:** 2026-09-12

## Context

A row in `alerts` is an outbox entry. An after-insert trigger, `dispatch_alert`,
posts the alert id to the `send-alerts` Edge Function through `pg_net`, and the
function stamps `sent_at` when it is done. ADR 0012 explains why the outbox
exists at all.

The post was fire-and-forget with a 5000 ms timeout. `pg_net` is asynchronous,
so the response lands in `net._http_response` long after the trigger's
transaction has ended. Nothing read it.

On 2026-09-12 a Feed Due Alert for a 12:00 pm feed was queued correctly at
11:45 am and never arrived. The Edge Function cold start imports
`npm:@supabase/supabase-js@2` before the handler runs. That took 5539 ms.
`pg_net` cut the connection at 5004 ms, the function answered nobody, and the
row was left with `sent_at`, `error` and `suppressed_reason` all null.

Nothing retried it. Twelve alerts were lost that way in fourteen days, and the
only way to find them was to query the table by hand. The index
`alerts_pending_idx` was described in the original migration as "the Edge
Function's work queue", but no job had ever read it.

## Decision

Dispatch is at-least-once. Three parts:

1. **The timeout is 20000 ms, not 5000 ms.** A warm call answers in about
   1.5 seconds, so the higher ceiling costs nothing in the normal case and
   covers a cold start.
2. **`private.sweep_pending_alerts()` runs every five minutes.** It reposts any
   alert still pending three minutes after its last attempt, up to six
   attempts. The trigger post stays — it is what makes the common case
   immediate. The sweep is the net under it, not a replacement.
3. **A row that can never be sent is closed.** Past six attempts, or an hour
   after it was queued, the sweep stamps `sent_at` with an `error` that says
   how many attempts it took. `sent_at` means "resolved", not "delivered", and
   `error` is what tells the two apart — the same contract the Edge Function
   already used for `no recipients`.

`private.post_alert(uuid)` owns the Vault read and the POST, because the
trigger and the sweep must send the identical request.

## Consequences

**At-least-once means a duplicate is possible.** If the Edge Function sends to
Expo and then fails before it stamps `sent_at`, the retry sends the push again.
The retry window is three minutes and the function stamps as its last act, so
the window is small — but it is real, and it is the right trade. A household
that hears twice knows their pet needs feeding. A household that hears nothing
does not.

**A late nudge is worse than no nudge.** A Feed Due Alert is a nudge for a feed
that has not happened yet. The sweep suppresses one whose `subject_at` has
passed, with `too late to nudge`. That is a suppression, not a failure: the
missed-feed sweep is what speaks for a feed that has already gone by.

**The database still cannot see a failure directly.** `pg_net` does not report
back into the calling transaction. A row still pending at the next sweep is the
only evidence of failure the database ever gets, which is why the sweep is the
detector as well as the retry.

**Nothing tells a human.** A repeated failure now leaves a trail in
`alerts.error` instead of silence, but no one is paged. External monitoring is
the next step and is not part of this decision.

## Alternatives rejected

**Read `net._http_response` and act on the status.** It is the direct signal,
but `pg_net` purges that table on its own schedule, so a response can be gone
before anything reads it. The pending row is durable; the response is not.

**Make the trigger synchronous.** `log_feed` would then wait on a cold start.
ADR 0012 already rejected this, and the incident is an argument for it, not
against it.

**Retry forever.** A nudge twenty minutes late is not a nudge, and an unbounded
queue turns one broken alert into a permanent load.
