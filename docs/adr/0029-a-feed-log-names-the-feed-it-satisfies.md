# 29. A feed log names the feed it satisfies

Date: 2026-08-19

## Status

Accepted

## Context

`log_feed(target_pet_id, target_logged_at, target_notes, confirmed)` records a pet and a
timestamp. It does not record which feed the member meant. The app works that out
afterwards, by seeing which Grace Window the timestamp falls into.

That inference is the source of four behaviours members find confusing, and they are all the
same bug wearing different clothes.

- **A late log stops counting.** Dinner is at 18:00 with a 60-minute window. Log at 19:52 and
  the timestamp matches nothing, so the log becomes an Extra Feed and dinner still reads Not
  Logged. The member fed the dog and told the app, and the app says nobody fed the dog.
- **Extra Feed cannot be chosen.** `CONTEXT.md` says so outright: "There is no way to create
  one deliberately." A snack and a late dinner produce the same record.
- **Double Feed is a guess.** Two logs near one time might be two people logging the same
  feed, or one pet eating twice. The app decides, and it can be wrong.
- **The window has to be symmetric.** Early feeding needed its own rule, because the window is
  being asked to identify a feed rather than to time a reminder.

Apple's medication model does not have these problems, and the reason is instructive. Its
tolerance window only delays a follow-up notification. A dose counts because the person taps
Taken against a specific dose. The window never has to work out what they meant.

So the Grace Window here is doing two jobs: deciding **what a log means**, and deciding **when
to nudge**. Only the second is a window's job.

## Decision

**A feed log names the feed it satisfies.** `log_feed` takes the feed the member is logging.
`feed_logs` stores that link.

The Grace Window keeps only its second job: it decides when an unlogged feed nudges the
household. It no longer decides what a log means.

A log that names no feed is an **Extra Feed** — a snack, deliberately recorded. It is a choice
the member makes, not a verdict the app returns.

## Consequences

**Late logging becomes ordinary.** Log dinner at 19:52 and it is dinner, logged late. The
household is told. Nothing is called missed, and nothing is called extra.

**Double Feed becomes precise.** Two logs against one feed is an unambiguous fact, so the
warning can name the collision: "Sarah logged Bailey's dinner at 6:05 pm." Two buttons, one is
Cancel, which is what an alert is for.

**Satisfying Feed stops being derived.** The match is stored, so it survives a schedule edit
and does not have to be recomputed on read.

**The symmetric window loses its reason to exist.** Feeding early no longer needs a rule,
because an early log names its feed like any other.

**The suppression rule goes.** A feed logged more than 30 minutes late is currently recorded
and not pushed. That existed because a late log was probably not about the scheduled feed. Now
it says so explicitly, so the household hears about it.

**Nothing about `log_feed` becomes less careful.** It keeps the advisory lock and the
single-transaction check. What changes is what it is checking.

## Alternatives considered

**Widen the Grace Window.** Cheapest, and wrong. It makes the guess later rather than
removing it, and a window wide enough to catch a two-hour-late dinner swallows the next feed.

**Match the nearest feed regardless of distance.** Removes Extra Feed entirely, so a genuine
snack is recorded as a feed the pet did not have at a time it did not happen.

**Ask afterwards — "was that dinner?"** Adds a question to the most common action in the app,
to recover information the member already had when they tapped.

## References

- `docs/research/pet-care-scheduling-patterns.md`, section on Apple's medication model
- ADR 0002, the missed-feed alert engine
- ADR 0012, recipient-controlled alert delivery
