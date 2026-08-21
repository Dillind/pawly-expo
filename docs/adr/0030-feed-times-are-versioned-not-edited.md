# 30. Feed times are versioned, not edited

Date: 2026-08-19

## Status

Accepted

## Context

`feeding_schedules` holds a bare `time` per pet, the same every day, forever. Two problems
follow.

**Editing rewrites the past.** Slot state is derived at read time from the *current* schedule.
Move dinner from 18:00 to 20:00 and last Tuesday's on-time feed retroactively becomes a missed
one. The history is not wrong in the database; it is recomputed into a different answer every
time someone edits a time. That makes missed-feed history fiction.

**A schedule cannot vary by day.** "No dinner on Sundays" is not expressible. A bare time
column has nowhere to put it.

Half of the fix is already built and unnamed. `slot_states_new_slots_start_tomorrow` filters
on `(feeding_schedules.created_at at time zone household_timezone)::date < target_date` — a
validity range with one end and no name.

## Decision

**A feed time is versioned. Editing closes one version and opens another.**

Each row carries a stable `series_id`, the local time, the days it applies to, and an
`effective daterange`. Versions of one series may not overlap, enforced by an exclusion
constraint over `btree_gist`. An edit closes the current range and inserts a successor
starting tomorrow. Rows are never updated in place and never deleted.

**Occurrences are computed, not materialised.** The rule stays the source of truth and is
expanded on read for a given local date. No rows are generated for future feeds.

**A pet can be paused** for a date range. Boarding, a vet stay, fasting before surgery. No
feeds are expected and nobody is nudged.

## Consequences

**History reads through the schedule that applied on the day.** Yesterday is read with
yesterday's times, whatever today's are.

**`alerts.subject_id` has to change, and this is the sharp edge.** It currently holds a
`feeding_schedules.id`, and the idempotency index is `(kind, subject_id, subject_date)`. Under
versioning that id changes on every edit, so a household would be re-notified about a day it
had already been told about. `subject_id` must hold the `series_id` instead. Six migrations
join on this column today.

**Nothing needs a horizon.** Expanding a rule into stored rows would require deciding how far
ahead to generate, and there is no correct answer. RFC 4791 makes the same point about
recurrence instances. Google Calendar and Microsoft Graph both keep the rule authoritative and
require callers to name a window.

**Deletion becomes closure.** Removing a feed closes its range. Past days keep it, so their
history stays true.

**A migration has to backfill.** Existing rows become the first version of their series, with
`effective` starting at their `created_at` date — which is what the current filter already
means.

## Alternatives considered

**Materialise occurrences.** Generate a row per expected feed. It gives frozen history, but by
accident rather than design, and it introduces rows that drift out of step with the rule that
made them. At two to four rules per pet there is no performance case for it.

**Store an RFC 5545 RRULE string.** Expressive, and far more than is needed. It also puts the
recurrence beyond the reach of SQL — the rule would have to be parsed in the client to answer
"what is due today", which is exactly the query Postgres should be answering.

**Accept the rewriting.** Free, and the one option that leaves a member's history quietly
wrong. Nobody notices until they scroll back, which is the worst time to find out.

**Full bitemporal modelling.** Correct, and far past what this needs. One validity range gets
the value; a second time axis for "when we knew it" does not.

## References

- `docs/research/recurring-schedule-modelling.md`
- Postgres range types and exclusion constraints, `btree_gist`
- ADR 0029, which stores the log-to-feed match this decision keeps stable
