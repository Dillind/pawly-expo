# 44. A Follow Request names the Households it comes from

Date: 2026-09-23

## Status

Accepted. Extends [ADR 0036](./0036-a-follow-is-a-household-scoped-read-plus-a-voice.md).
Implements [issue #248](https://github.com/Dillind/pawly-expo/issues/248) (CRU-183).

## Context

An Owner who accepts a Follow Request wants to follow back, as on Instagram. A Follow is from a
person to a Household, so "back" needs a Household, and a person can be in none, one or several.

## Decision

**The sender names the Households, not the receiver.** A request can name any of the Households
the sender owns: one or several, never none. They live in `follow_named_households`, which only definer
functions reach. The receiver sees them before deciding, and a Follow Back can go only there.

- Only Households the sender **owns**. Naming a Household promises its Owners' consent, and a
  Contributor cannot give it.
- **Only an Owner can follow.** A request that names no owned Household is refused
  (`no_household`), so every request has a Follow Back. A Contributor's role is the Pets' daily
  care, not the social side; following as a person with no Household is a possible later feature.
- The default is the current Household if the sender owns it, else their only owned one.
- It is checked when shown, not when sent. A Household the sender no longer owns is left out of
  the list, the Follow Back and the push.
- A Follow Back names the Household that accepted, so the other side sees "Following" and the loop
  stops after one step.
- Naming grants nothing. The read boundary of ADR 0036 is unchanged.

**The Inbox shows the requests as one pinned row.** `list_alerts` leaves out `follow_requested`;
`unread_alert_count` keeps it. The pinned row and the requests screen mark those alerts read, so
the rule that the badge can be cleared by reading the list still holds.

## Rejected

**The receiver picks from all of the sender's Households.** This showed Households the sender had
not offered, including ones where they are only a Contributor, and it needed a function that turns
a user id into a list of Households — the thing ADR 0036 said no route does.

**A Household follows a Household.** It would change the read boundary for every Member of the
following Household. The owner of this app confirmed a Follow stays personal.

## Consequences

- `request_follow` takes a second argument. The one-argument form is gone.
- The Owner's lists read through `list_household_follows` rather than the table.
- The push reads the first named Household, sorted by name, the same order the lists use.
