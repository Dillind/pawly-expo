# 21. A like is a record, not an interruption

Date: 2026-08-15

## Status

Accepted. Narrows the "likes never queue an alert at all" note in
`20260809090200_queue_post_alert.sql`.

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
social feedback. Rejected because the Household stream already exists and is the one part of the
app people use for pleasure rather than duty; posting into silence is what makes a stream feel
dead.

**Push it, behind a preference defaulting to off.** Rejected. It reintroduces the exact failure
mode the original note describes for anyone who ever turns it on, and it buys a preference row for
something no one asked for. The inbox already gives the author the information without the cost.

**Collapse repeated likes into one row, Hevy-style ("Lisa and 2 others liked your post").** Deferred,
not rejected. It needs an aggregate the current one-row-per-event schema cannot express, and with a
four-person household the row count it saves is at most three. Worth revisiting only if households
get larger.
