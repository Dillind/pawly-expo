---
status: accepted
---

# Missed-feed detection is a database sweep, not a scheduled Edge Function

A `pg_cron` job runs `private.sweep_missed_feeds()` every 15 minutes. It calls
`private.slot_states` per pet and inserts an `alerts` row for each slot that
came back `missed`. The existing `alerts_dispatch` trigger and the `send-alerts`
Edge Function deliver it, unchanged.

This retires the mechanism half of [ADR 0002](./0002-missed-feed-alert-engine.md).
Everything else in 0002 stands: timezone on the Household, a per-household
Grace Window, "any feed in the window" matching, and keying off `logged_at`.

## Considered options

- **A scheduled Edge Function**, as ADR 0002 described — rejected. That ADR
  predates the outbox. [ADR 0012](./0012-recipient-controlled-alert-delivery-and-the-outbox.md)
  split queueing an alert from delivering one, and detection is queueing: every
  other path that queues an alert is already a database trigger. An Edge
  Function sweep would give us two places that insert `alerts` rows, in two
  languages, and the new one would be the awkward one — its whole body a loop
  calling a SQL function, because [ADR 0009](./0009-symmetric-grace-window-derived-slot-matching.md)
  puts all Grace Window arithmetic in `private.slot_states` and forbids
  reimplementing it in TypeScript. One network round trip per pet, to reach
  code already reachable for free.
- **pg_cron calling an Edge Function that then detects** — rejected. Two
  scheduled systems, a network hop between them, and a shared secret to manage,
  all to arrive at logic that lives in SQL anyway.
- **A database sweep** (chosen).

## Consequences

- **Idempotency comes for free.** `alerts_idempotency_idx` is already unique on
  `(kind, subject_id, subject_date)`, so the insert is `on conflict do nothing`
  and a double run is harmless by construction rather than by care. That index
  was added in the outbox migration for this sweep specifically.
- **A sweep outage loses those alerts permanently**, because the sweep only
  considers slots whose Grace Window closed in the last 30 minutes. Accepted: a
  missed-feed alert is only useful while you can still act on it, so the
  alternative is delivering noise.
- **The sweep is `security definer` owned by `postgres`** and is not granted to
  `authenticated`. `private.slot_states` is `security invoker`, so it runs as
  the sweep's owner — which is what lets one call see every household.
- **Detection latency is bounded by the cadence.** A slot whose window closes at
  08:00 is nudged between 08:00 and 08:15.
- **Debugging moves to `cron.job_run_details`** rather than Edge Function logs.
- **The Nudge Limit counts alerts that reached someone**, not alerts that exist.
  The count filters on `error is null`, so a row stamped `no recipients` — a
  household where everyone has Missed Feed Alerts off — does not consume a
  nudge. Counting those would mean muting burns the three nudges in silence,
  and turning alerts back on delivers nothing until someone logs a feed. The cost is that a
  fully muted household keeps accruing alert rows. That is bounded, not
  unbounded: `alerts_idempotency_idx` allows one row per slot per local date,
  so it is a few rows a day, each dispatched once and stamped.
- **A malformed household timezone cannot take the run down.** `households.timezone`
  is unconstrained text set by the client, and `now() at time zone` raises on a
  bad value. The per-pet body therefore sits in its own exception block: a bad
  row is logged with `raise warning` and skipped, and every other household
  still gets its sweep. Without it, one bad row would cost every household
  that cycle's alerts, silently, since nobody watches `cron.job_run_details`.
