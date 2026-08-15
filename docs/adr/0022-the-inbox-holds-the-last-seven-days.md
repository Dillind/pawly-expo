# 22. The Inbox holds the last seven days

Date: 2026-08-15

## Status

Accepted.

## Context

The Inbox had no way to remove anything. A row was read or unread, and it stayed forever. People
tidy their notification inboxes, and a list that only ever accumulates is one people stop opening.

The obvious answer was a swipe: reveal a bin, clear the row. That was built, on a per-user
`alert_dismissals` table, and rejected on use. Clearing rows one at a time is work the app asks of
people in order to keep a list usable. It also brought an undo question, a per-user table, a gesture
primitive, and an exception to the "every mutation toasts" rule — all to solve a problem the list
could solve itself.

## Decision

**The Inbox shows Alerts from the last seven days. Older ones are not shown.**

**Nothing is deleted.** An `alerts` row is one per event, not one per recipient — that shape is
deliberate (`20260728090200`) so recipients resolve at send time — and it is also the delivery
record the Edge Function writes to. Deleting old rows would destroy history that belongs to the
whole Household, and take the sent/suppressed record with it. So the cutoff is applied **when
reading**, and one Member's Inbox thinning out never touches anybody else's.

`list_alerts`, `unread_alert_count` and `mark_all_alerts_read` all filter on
`private.alert_window_start()`. One definition, for the same reason `private.alert_is_mine` has one:
a row the list hides but the count includes is a badge that cannot be cleared, and a tick that marks
unreachable rows as read is the same fault wearing a different hat.

## Consequences

The list bounds itself and needs no gesture, no undo, and no second table. It also gives the screen
a shape it did not have: a single heading, so it goes through `MainLegendList` rather than needing a
`SectionList`.

Seven days is short enough that a Member who opens the app weekly still sees everything since their
last visit, and long enough that the window is rarely the reason something is missing. It is a
number to revisit, not a principle.

Old Alerts become unreachable from the app while remaining in the table. That is a growing table
nobody reads — acceptable at four people per Household, and a reason to keep the delete option open
as a server-side retention job if it ever stops being.

## Alternatives considered

**Swipe to clear, per user.** Built and removed; see Context. The reasoning that made it per-user
rather than a delete still holds and is the reason this decision reads the same way.

**A "Clear all" button.** Rejected with the swipe. With no undo, a one-tap wipe has no way back.

**Delete rows older than seven days on a schedule.** Rejected for now. It gives the same Inbox and
loses real history, including the delivery record. Reading is reversible; deleting is not.
