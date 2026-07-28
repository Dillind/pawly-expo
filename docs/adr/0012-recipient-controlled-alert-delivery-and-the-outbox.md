---
status: accepted
---

# Alert delivery is universal and recipient-controlled, and it runs through an outbox

A Feed Logged Alert goes to **every Member of the Household except the author, unless that Member has turned Feed Logged Alerts off**. Role does not appear in the rule. Logging a feed does not call the notification service directly: it queues a row in `alerts`, and a separate trigger dispatches that row to an Edge Function which resolves recipients at send time. The sender is never offered a choice about whether the notification is sent.

Three decisions, recorded together because they answer one question — who decides that a household member finds out the dog was fed.

## Considered options

### Who receives an Alert

- **Role-based routing ("Contributors are never notified")** — rejected. It leaves the important case unspecified: ADR 0001 allows multiple Owners, and the realistic v1 household is a couple who are both Owners, so role-based routing notifies nobody and the v1 milestone in PRODUCT_BRIEF ("that person receives a push notification — that's the moment the app proves its value") cannot happen at all. It is also the wrong axis: `Owner` and `Contributor` are permissions concepts, and the midday dog walker may well want to know the owner already fed at 7am so she does not feed him twice — the Double Feed the app exists to prevent, hidden by the routing rule.
- **Universal delivery, tuned by per-member preference** (chosen). The annoyance role-routing was meant to solve is handled by **defaults** instead: Contributors start with Feed Logged Alerts off, so the paid walker is not buzzed every morning. A default is a toggle the user already has; a routing rule is a migration and an ADR.

### Who controls delivery

- **A "send a notification?" control on the log-feed sheet, defaulting to on** — rejected. It inverts control. Every other layer — the per-member preference, the app-level switch, the OS permission — puts the decision with the *recipient*. A sender-side opt-out hands it to the person with the least standing to make it, and the case it breaks is the app's whole reason to exist: a considerate member ticks "don't notify", and their partner feeds the dog an hour later. That is the Double Feed, reintroduced through the UI after an RPC was built to prevent it. It also puts a decision inside the three-second logging loop PRODUCT_BRIEF protects, and it is a decision most people will get wrong in the polite direction.
- **An automatic rule on the age of the feed** (chosen). `logged_at` is when the pet was *actually* fed, and backdating up to 24 hours is allowed and ordinary. An Alert whose feed is more than **30 minutes** old is recorded as a Suppressed Alert and never pushed. The value of a Feed Logged Alert is entirely "don't feed him again", and that value decays with the age of the feed, not of the log. The threshold is a judgement, not a derivation — 15 would also be defensible; 60 starts pushing things nobody can act on.
- Transparency is provided instead of control: the log-feed sheet names who will be notified.

### How an Alert reaches a device

- **A trigger on `feed_logs` calling the Edge Function directly** — rejected, on the strength of what comes next rather than what exists today. The missed-feed cron (ADR 0002) runs every 15 minutes, and a slot missed at 08:00 is still missed at 08:15, 08:30 and every run after. Without a durable record of "already alerted for this slot on this date" the engine pushes "Bailey hasn't been fed" to the whole household four times an hour — precisely the failure PRODUCT_BRIEF names as fatal, delivered by the feature meant to prevent it.
- **An outbox** (chosen). The engine needs a sent-record regardless, so building it now costs nothing extra and avoids ending up with two delivery paths. `unique (kind, subject_id, subject_date)` is the idempotency key that makes the cron safe.

## Consequences

- **Recipients are resolved at send time, not fanned out at queue time.** `alerts` holds one row per *event*, not per recipient, so a preference changed between queue and delivery is respected. It also means the table cannot answer "who was this delivered to" — only "what happened and when was it sent".
- **Muting silences the push, not the record.** Someone with Feed Logged Alerts off still has the rows. They have asked not to be interrupted, not to be kept in the dark — which is what makes a future in-app notification history coherent.
- **A Suppressed Alert is written, not skipped.** Skipping would make "we chose not to interrupt you" indistinguishable from "the dispatch never fired", which is the single hardest thing to debug in this chain. `suppressed_reason` is a separate column from `error` because suppression is not a failure.
- **Preference column defaults are the quiet ones** (`feed_logged_alerts` defaults to `false`), with the founding Owner's `true` written explicitly by `create_household_and_pet`. A column default is what every future path inherits — the invite-accept path, a hand-seeded row, a backfill — and a path someone forgets to update should be silent rather than noisy. The cost is that a member created outside that function is muted until something sets the flag.
- **The 30-minute threshold is invisible.** A member who logs a feed two hours late is given no indication that nobody was told. If that turns out to surprise people, the fix is a line in the log-feed sheet, not a toggle.
- **Role still determines defaults, so the role rule has not disappeared** — it has moved from routing (irreversible) to initial values (a toggle away from being wrong).
