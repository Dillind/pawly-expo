# 16. Logging a late feed is a choice, not a default

Date: 2026-08-07

## Status

Accepted

## Context

Logging a feed now means picking which Scheduled Time you are logging, rather than
letting the app infer one from the clock. Picking a Scheduled Time is really picking a
`logged_at`, and two rules in the database decide what that timestamp can be:

- A Feed Log satisfies a Scheduled Time only if it falls inside that slot's Grace Window
  (ADR 0009).
- A Feed Log more than 30 minutes old at insert queues a Suppressed Alert and notifies
  nobody (ADR 0012).

Inside the Grace Window these never conflict. `now` and the Scheduled Time mean the same
thing, so the app writes `now`, the slot clears, and the household is notified.

Once the Grace Window has closed they conflict directly, and the common case walks
straight into it. Dinner is due at 5:00 pm with a 60-minute window. The missed-feed sweep
notifies the household at 6:15 pm. Somebody feeds the dog at 6:20 pm and taps the row.

- Writing the **scheduled 5:00 pm** clears the row, but the log is 80 minutes old at
  birth, so the alert is suppressed. Nobody is told the dog was fed. The one message the
  product exists to deliver is not sent, and the record says a thing that is not true.
- Writing **6:20 pm** is honest and notifies everyone, but the log lands outside the
  window, so it satisfies nothing. The row still reads Not Logged after the feed was
  logged — the "the app said the pet wasn't fed when it was" failure PRODUCT_BRIEF calls
  trust-collapsing.

Both are defensible and neither is right in every case. Which one a person wants depends
on something the app cannot see: whether they fed the dog at 5:00 pm and are only now
getting round to recording it, or fed it just now.

## Decision

**When the Grace Window has closed, the app asks.** A pick on a `missed` Scheduled Time
opens a confirm step offering both timestamps, each stating its own consequence:

- **Just now, 6:20 pm** — the household will be notified; the Scheduled Time stays Not
  Logged. Produces an Extra Feed.
- **At the scheduled 5:00 pm** — clears the Scheduled Time; nobody will be notified.

A pick on a `due` Scheduled Time writes immediately with no confirm at all.

## Consequences

The asymmetry is the point. The confirm appears exactly where the app would otherwise be
putting words in the user's mouth, and nowhere else, so the fast path stays one tap.

Neither answer is a bug report. "Nobody will be notified" is stated up front rather than
discovered later, which is the difference between a suppressed alert and a silent
failure.

A household that finds itself choosing "just now" every evening has learned something
real: its Grace Window is too narrow. That is a setting it can change, and it is a better
outcome than the app quietly picking one of the two answers on the household's behalf.

The alternative of widening or removing the Grace Window requirement for satisfaction was
rejected. It would put the matcher's rule in two places — a slot could be satisfied by a
log the matcher itself would not assign to it — and ADR 0009 exists precisely to keep that
arithmetic in one function.
