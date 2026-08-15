# 21. A like is a record, not an interruption

Date: 2026-08-15

## Status

Accepted. Narrows the "likes never queue an alert at all" note in
`20260809090200_queue_post_alert.sql`.

**Amended by CRU-051 (2026-08-15).** The warning at the end of Consequences came true within a day:
three personal kinds arrived at once. The `post_liked` filter described below is gone, replaced by a
`recipient_id` column on `alerts`. See the Amendment at the foot of this file. Nothing else here
changed — the reasoning held, only the mechanism moved.

## Context

Liking a post wrote a `post_likes` row and stopped there. The author was never told.

That was deliberate. The migration that added Post Alerts says so plainly:

> Likes never queue an alert at all. A thumbs-up is not worth an interruption, and the first time
> somebody gets three pushes because three people liked one photo, they mute the app — including
> the Missed Feed Alert that matters.

The reasoning is sound and still is. Muting is not partial. Someone who turns Crumpet off because
it buzzed three times about a photo has also turned off the alert that tells them the dog has not
been fed. That is the whole product failing to protect the one thing it exists to do.

What changed is not the reasoning. It is that **an alert and a push stopped being the same thing.**

When that comment was written there was no inbox, so queueing a row and interrupting someone were
one act. The inbox shipped in CRU-041, and `suppressed_reason` already existed to mark a row as
recorded-but-deliberately-not-sent — `dispatch_alert` returns early on it, and the pending index
skips it. The membership alerts (`20260814090100`) already use exactly this: a record, not a
delivery.

So the question is no longer "is a like worth a push?" — it plainly is not. It is "is a like worth
a line in a list the author chose to open?"

## Decision

**A like queues an alert with `suppressed_reason` set to `'like'`.** It appears in the inbox. It
never pushes, to anyone, ever.

Three consequences fall out of that, each a real choice:

**It is addressed to one member, not the household.** Every other alert kind is household news — a
feed, a missed feed, a post. "Lisa liked Dylan's photo" is news to Dylan and clutter to everyone
else. `list_alerts` and `unread_alert_count` both filter `post_liked` to the post's author. They
have to agree: a row the list hides but the count includes is a badge that cannot be cleared.

**One row per person per post, forever.** A partial unique index on `(subject_id, actor_id)` where
`kind = 'post_liked'` enforces it. Removing a like does not retract the alert, and liking again
does not write a second one. Retraction was rejected — "someone liked your photo, then thought better of it"
is not information anybody benefits from, and it makes an inbox row a thing that can vanish while
you are looking at it.

**Liking your own post queues nothing.** The trigger returns early. The reader-side rule
(`actor_id <> auth.uid()`) would hide it anyway, but writing a row nobody can ever see is a leak,
not a safeguard.

## Consequences

The author finds out, at a time of their choosing, and nobody's phone buzzes. The failure the
original note guarded against cannot happen, because the push path is closed at the database.

The inbox now carries two different kinds of thing: household news, and one line addressed
personally. That is a seam worth watching. If a second personal kind appears — a comment, a reply —
the filter-per-kind approach here will not scale, and the honest answer at that point is a
recipient column on `alerts`, not a third bespoke `where` clause. This ADR is the warning for
whoever hits that.

A like is also now the cheapest way to generate an inbox row, which makes it the easiest to abuse
inside a household. That is not worth defending against in a four-person private group, and it is
worth remembering if the household model ever widens.

## Alternatives considered

**Leave it alone.** The status quo, and defensible — the app is about feeding a pet, not about
social feedback. Rejected because the Household tab already exists and is the one part of the
app people use for pleasure rather than duty; posting into silence is what makes it feel
dead.

**Push it, behind a preference defaulting to off.** Rejected. It reintroduces the exact failure
mode the original note describes for anyone who ever turns it on, and it buys a preference row for
something no one asked for. The inbox already gives the author the information without the cost.

**Collapse repeated likes into one row, Hevy-style ("Lisa and 2 others liked your post").** Deferred,
not rejected. It needs an aggregate the current one-row-per-event schema cannot express, and with a
four-person household the row count it saves is at most three. Worth revisiting only if households
get larger.

## Amendment — CRU-051, 2026-08-15

The Consequences section above ends with a warning:

> If a second personal kind appears — a comment, a reply — the filter-per-kind approach here will
> not scale, and the honest answer at that point is a recipient column on `alerts`, not a third
> bespoke `where` clause.

Three arrived together: a like, a role change (CRU-056), and an invite (#44). The third cannot be
expressed as a `where` clause at all — `list_alerts` gates on `private.is_household_member`, and an
invitee is not a Member yet, so no household-scoped rule can reach them.

**`alerts` now has a nullable `recipient_id`.** Null means Household News: everyone in the
Household is told. Set means the alert is addressed to one person, and reaches them wherever they
are. The `post_liked` filters in `list_alerts` and `unread_alert_count` are gone; the trigger sets
the recipient to the post's author instead, and the readers need no knowledge of what a like is.

The rule is stated once, in `private.alert_is_mine(household_id, recipient_id)`, and the two
readers, the two mark-read RPCs and the RLS policy all call it. The agreement this ADR insisted on
between the list and the count is now structural rather than a thing two functions each remember to
do.

One detail worth recording, because it is easy to get wrong twice: `alert_is_mine` grants execute to
`authenticated`, unlike every other function in these migrations. An RLS policy expression is
evaluated as the querying role, so a revoke makes the policy fail with "permission denied" rather
than return false. `private.is_household_member` is granted for the same reason.

**What this does not yet do.** The permission rule is household-agnostic — an Addressed alert is
visible to its recipient at the RLS layer whether or not they are a Member. The readers are not.
`list_alerts` and `unread_alert_count` still take a `target_household_id` and still filter on it, so
an Addressed alert is only reachable through the Household it came from. For a like or a role change
that is exactly right; the recipient is a Member and is looking at that Household. For an invite it
is not: an invitee has no Household to ask for, so #44 is unblocked at the schema and still blocked
at the reader. Dropping that argument is CRU-059's shape, and doing it here would have meant an
inbox that silently mixed Households before the design called for it.

What did **not** change: a like still never pushes, still writes one row per person per post, and
still queues nothing when you like your own post. The push path stays closed at the database.
