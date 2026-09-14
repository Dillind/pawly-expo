# 39. Home owns the Household; Settings is personal

Date: 2026-09-15

## Status

Accepted. Moves what [ADR 0012](./0012-recipient-controlled-alert-delivery-and-the-outbox.md) and
[ADR 0036](./0036-a-follow-is-a-household-scoped-read-plus-a-voice.md) put under Profile, and
changes no behaviour in either.

## Context

Household settings have lived under Profile since they existed, at
`src/app/(protected)/(tabs)/profile/household/[householdId]/`. Feed times, members, notifications,
the handle and followers are all reached by opening Profile, then Settings, then a row named for the
household.

That placement was never argued for. It happened because Settings was the only list-shaped screen in
the app when the first of those screens was written.

It has cost us twice.

The first cost is a real bug. Settings showed one row for the _active_ household. A member of
several believed she had silenced all of them when she had silenced one. The fix was a row per
household plus a caption explaining that these settings belong to one alone — a caption that exists
only because the information is in the wrong place.

The second cost is conceptual. A Household is not personal. It is the shared thing. Putting it
behind a tab named for one person tells every member that the household is a property of whoever is
logged in. It is not. Two members open the same household and see the same feed times.

Meanwhile Home already owns everything else about the household: the pets, the feed slots, the day,
the week, the switcher that names which household you are looking at.

## Decision

Household settings move to `home/`. Settings keeps only what belongs to the account.

- `profile/household/[householdId]/*` becomes `home/household/[householdId]/*`.
- Settings loses its "Your households" section, and the caption with it.
- Profile loses its Household card.
- The door is a **Household** tile in Home's dashboard grid, not a gear in the header. A tile says
  what is behind it. A gear does not, and a gear beside the Household tile would be two doors to one
  room.

Two terms are now separable and both are in `CONTEXT.md`: **Household Settings**, which every member
sees and the Owner can change, and **Account Settings**, which is one person's.

## Consequences

**Push payloads embed route paths.** `supabase/functions/send-alerts/message.ts` carries them, so the
Edge Function has to be redeployed with the move. Notifications already delivered keep the old path
and will land on Unmatched Route. That is accepted: an alert is read within minutes or not at all.

**The generated route types go stale and the compiler says nothing.** A moved route typechecks
cleanly and fails at runtime. Every moved screen is opened on a simulator before the branch merges.

**Profile gets thin.** It becomes an avatar, two counts and the person's posts. That was weighed
against merging Settings into it and against deleting the tab. Both were rejected: settings rows
under an infinitely paginating post list are unreachable, and deleting the tab leaves a follow
pointing at a household with no author behind it.

## Alternatives considered

**Leave it under Profile and fix the bug.** Already done, and the caption is the evidence that it did
not work. The bug came back as a documentation problem.

**A fourth tab for the Household.** Rejected. Home is already the household's screen; a second one
would split the same subject across two tabs and leave neither with enough to justify itself.

**A gear in the Home header.** Rejected in favour of the tile. See the decision above.
