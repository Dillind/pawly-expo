---
status: accepted
---

# The Grace Window is symmetric, and slot matching is derived rather than stored

A Feed Log satisfies the Scheduled Time nearest to it within `± grace_window_minutes` — a 60-minute window makes 06:00–08:00 satisfy an 07:00 slot. That match is computed on demand by a single function in the `private` schema, called by both the app and the missed-feed cron. No column on `feed_logs` records which slot a log satisfied.

Two decisions, recorded together because they are load-bearing for the same thing: the app's answer to "has the pet been fed?" must be identical everywhere it is asked.

## Considered options

### Window shape

- **Late-only, as the glossary originally read** — rejected. Under a late-only window, feeding at 06:45 for an 07:00 slot satisfies nothing: the cron pushes "Rufus hasn't been fed" to the whole household at 08:00, 75 minutes after he was fed, and the double-feed warning stays silent if someone then feeds him again at 07:10. PRODUCT_BRIEF names this precise failure as the one that makes users delete the app — "if the app makes it look like the pet wasn't fed when it actually was, trust collapses instantly". Feeding early is ordinary behaviour, not an edge case.
- **Separate early and late windows** — rejected for v1. More faithful to how people actually feed (early is more common than late), but it adds a second configurable number, a second glossary term, and a second thing to explain in the UI, to buy asymmetry nobody has asked for yet.
- **Nearest slot always claims, no window at all** — rejected. Removes orphan logs entirely, but a 3pm snack would silently claim the 5pm dinner slot and suppress that slot's Missed Feed Alert. A log that belongs to no slot is a real and valid state.
- **Symmetric window** (chosen). One number, symmetric, predictable, and it keeps "Grace Window" as the single knob a household configures.

### Where the rule lives

- **Store the matched slot on the log** (an FK to `feeding_schedules`, or a snapshot of the matched time) — rejected. `logged_at` is deliberately mutable: the feed log is backdatable and correctable within 24 hours, which is a core trust feature. Any match written at insert time goes stale the moment a log is backdated or edited, so every write path would have to recompute it, and every path that forgets becomes a silent divergence between what the Activity screen shows and what the cron believes. An FK additionally couples historical logs to schedule rows that Owners can delete.
- **Derive on demand from one shared function** (chosen). A feeding schedule is 2–4 rows per pet, so recomputation is free. More importantly, there is exactly one implementation of "satisfying": the double-feed warning, the Home screen's per-slot state, and the missed-feed cron all call the same function and cannot disagree.

## Consequences

- **Editing a Feeding Schedule retroactively changes history.** Moving a slot from 07:00 to 12:00 re-evaluates past days against the new schedule, so a day that read as fully fed may afterwards show a Missed Feed. Accepted for v1: schedule edits are rare, and the alternative (frozen history) reintroduces the two-sources-of-truth problem this decision exists to avoid. Revisit if schedule editing turns out to be common.
- **The function is the contract.** It must live in `private`, not `public` — `public` is a PostgREST-exposed schema, and ADR-adjacent history here (the `private_rls_helpers` migration) shows what happens when `SECURITY DEFINER` functions are left callable over the API. Any future caller uses the function rather than reimplementing the window arithmetic in TypeScript.
- **A slot has at most one Satisfying Feed and a log satisfies at most one slot.** Where two logs fall inside the same window, the nearest wins; the other becomes an unmatched log, still recorded and still visible in Activity.
- All window arithmetic resolves in the household's timezone, since Scheduled Times are wall-clock times with no date of their own.
