# 23. Feed logs are delivered, but not listed in the inbox

Date: 2026-08-16

## Status

Accepted. Amends [ADR 0012](./0012-recipient-controlled-alert-delivery-and-the-outbox.md).

## Context

On a barely-used test household two thirds of the inbox was `feed_logged`: 26 rows against
4 posts, 4 role changes, 2 likes, 2 missed feeds and 1 removal. A real household with three pets,
three feeds a day and three other members writes 60–90 feed rows a week on its own. Everything
else together is a trickle.

A feed log already has two homes. Activity is the full feeding history grouped by day. Home shows
today's state for each pet. The bell was a third place saying the same thing, and it buried the
handful of events that have nowhere else to go.

## Decision

The inbox does not list `feed_logged`. `list_alerts`, `unread_alert_count` and
`mark_all_alerts_read` all exclude the kind, so the list, the badge and the tick agree.

Delivery is untouched. A feed still pushes for a recipient with Feed Logged Alerts on. This is a
change to what the bell shows, not to who hears about a feed — that decision is still the
recipient's, per ADR 0012.

Nothing is deleted. `alerts` is the delivery outbox before it is an inbox, and those rows are the
record that stops a missed slot being pushed again every fifteen minutes.

## Consequences

What is left in the bell is the set with no other home: posts, likes, missed feeds, membership
changes and invites.

`feed_logged` leaves the client's `AlertKind` union, because the inbox is the only thing that reads
it back. The kind stays in the Postgres enum, where it is a delivery record.

`list_alerts` no longer returns `feed_log_id`, so the return type changed and the migration drops
and recreates the function rather than replacing it.

The count a member sees can now differ sharply from the number of alerts written. That is the
point, but it means "why is the badge not moving?" has a new correct answer: feeds do not move it.
