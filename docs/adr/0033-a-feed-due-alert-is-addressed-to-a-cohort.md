# 33. A Feed Due Alert is addressed to a cohort, not to an occurrence

Date: 2026-08-28

## Status

Accepted

## Context

The app only speaks after a failure. The first thing Crumpet says about a 5:00 pm dinner arrives
at 6:15 pm, and it says nobody logged it. The core scenario the brief describes — get home, get
busy, forget — is never interrupted at the moment it could still be fixed. A tool that only tells
you off is a tool people mute, and a muted app cannot prevent the failure PRODUCT_BRIEF calls
fatal.

The fix is a nudge before the feed. Two requirements arrived with it, and both attack the shape of
an `alerts` row.

**The lead time belongs to the member.** Ten, fifteen, thirty or sixty minutes, chosen per
membership like every other delivery preference (ADR 0012). So the send time is a property of the
recipient, not of the feed. A 5:00 pm dinner is no longer one event. It is four — 4:00, 4:30, 4:45
and 4:50 — one per cohort of members who chose that lead time.

**One push covers several pets.** A three-pet household with a shared 5:00 pm dinner must not
receive three notifications for what a person experiences as one event. Notification fatigue is how
this app gets muted, and the volume scales with pet count, so it hits exactly the households the
multi-pet work is for.

Neither fits the table. `alerts` is one row per _event_, with recipients resolved at send time, and
`subject_id` is `uuid not null` holding exactly one id. The first requirement multiplies the events.
The second turns the subject into a set.

## Decision

**A Feed Due Alert's subject is a cohort, not an occurrence.** One row per
`(household, lead time, feed instant, local date)`.

- `subject_id` holds the `household_id`. The column is already polymorphic and carries no foreign
  key.
- Two new columns: `lead_minutes smallint` and `subject_at timestamptz`, the instant the feeds are
  due.
- `send-alerts` **rebuilds the set** at send time: for each pet in the household, call
  `occurrence_states`, keep the occurrences at `subject_at` that have no Satisfying Feed. The
  rebuild _is_ the freshness check — there is no separate query for "was it logged in the
  meantime".
- Idempotency splits in two. `alerts_idempotency_idx` gains `where kind <> 'feed_due'`, and a new
  partial unique index covers `(kind, subject_id, subject_date, lead_minutes, subject_at)
where kind = 'feed_due'`.

**The sweep runs every five minutes and fires early.** All four lead times divide by five. A feed
time on a five-minute boundary is therefore exact; one at 5:07 pm sends up to five minutes early.
Early is right and late is not — a nudge that arrives after the moment it was for is an insult.

**A Feed Due Alert is never sent once the feed time has passed.** A skipped cron run drops the
nudge. There is no lookback, unlike the missed-feed sweep, because a stale "coming up" is worse
than silence.

**The group key is the exact feed instant.** Two feeds three minutes apart are two alerts. A
tolerance window would buy a rare case at the price of a rule nobody can predict.

**Lead Time never reads the Grace Window.** Lead Time decides how long before a feed the app
nudges, and the member owns it. The Grace Window decides how long after a feed the app waits before
it calls the feed missed, and the household owns it. Two settings, two owners, no arithmetic
between them.

## Consequences

**`alerts` now has two row shapes.** Five kinds name one thing that happened. `feed_due` names a
group of things that are about to. A reader who assumes `subject_id` resolves to a row in some
table will be wrong exactly once, on this kind.

**The rebuild is load-bearing, not an optimisation.** Because the set is derived rather than
stored, a pet fed between queue and send drops out of the message on its own, and a household whose
pets were all fed produces a `suppressed_reason` instead of a push. Store the set and both
behaviours have to be written by hand.

**The cancel path helps less often than it appears to.** Two members who both chose fifteen minutes
are pushed at the same instant, so neither can silence the other. The check only saves someone when
a feed is logged _before_ any nudge fires, or when two members hold different lead times. The first
case is common enough to carry the feature; the promise is smaller than "the app knows somebody
already did it" sounds.

**A member of two households gets two pushes.** `alerts.household_id` is `not null`, and the lead
time lives on the membership, so the same person can hold different lead times in each. Merging
across households needs a per-recipient outbox, which is the fan-out ADR 0012 rejected.

**No nudge limit and no quiet hours.** Missed Feed Alerts stop after three because a repeated
accusation reads as nagging. A due nudge never accuses, and the member set the lead time against a
feed time the household set, so a 5:00 am push is a choice already made twice. The off switch is
the cap. A dormant household therefore settles at three due pushes a day rather than six.

**The sweep reads today and tomorrow.** A 00:30 feed with a sixty-minute lead sends at 23:30 the
previous day. The missed-feed sweep reads yesterday and today for the mirror-image reason.

**A feed time removed today still nudges today.** `end_feed_time` closes the range from tomorrow,
so today's occurrence survives by design. The missed sweep already behaves this way.

**A five-minute cadence has a ceiling.** 288 runs a day, each a loop over every pet in every
household. It costs nothing today and it is the same shape `sweep_missed_feeds` already uses at
fifteen minutes. It will need an index-driven query long before anything else in this design does.

## Alternatives considered

**A child table**, `alert_occurrences (alert_id, series_id, occurrence_date)`. Explicit and
queryable. It still needs `occurrence_states` for the freshness check, so it stores a copy of a
truth it must re-derive anyway — and then the copy and the truth can disagree.

**Merge at send time.** Insert one row per occurrence, as the other kinds do, and let `send-alerts`
collect siblings. This is the shape issue #10 sketched. The `pg_net` trigger fires once per insert,
so three rows means three invocations racing for one group. It needs a lock and a debounce, and it
complicates dispatch for every kind to serve one.

**One lead time per household**, stored beside `grace_window_minutes`. It preserves one row per
event completely and it is much less work. Rejected because it inverts ADR 0012: delivery is the
recipient's decision, never the sender's, and a lead time is delivery. A household where one person
wants an hour and another wants ten minutes has no answer under it.

**A local notification on the device.** No server, no cron, no push token, and a per-member lead
time comes free because nothing is shared. Rejected on the cancel path, which is the whole
differentiator: only the server knows that somebody else already fed the pet. iOS also caps pending
local notifications at 64, and every schedule edit would need a reschedule on every device.

**A fixed fifteen minutes with no setting.** Simplest of all, and one row per event survives. It
makes the feature un-tunable for the two people it serves best — the early riser and the person
whose commute is an hour.

## References

- [ADR 0002](./0002-missed-feed-alert-engine.md) — the sweep this sits in front of
- [ADR 0012](./0012-recipient-controlled-alert-delivery-and-the-outbox.md) — the outbox, and why
  delivery is the recipient's decision
- [ADR 0029](./0029-a-feed-log-names-the-feed-it-satisfies.md) — the stored log-to-feed link that
  makes the freshness check exact
- [ADR 0030](./0030-feed-times-are-versioned-not-edited.md) — `series_id`, and why an edit starts
  tomorrow
- Issue #9 (CRU-086), and issue #10, which keeps the two kinds this does not group
