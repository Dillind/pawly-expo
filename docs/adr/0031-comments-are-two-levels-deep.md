# 31. Comments are two levels deep, and the thread is the post screen

Date: 2026-08-22

## Status

Accepted. Implements CRU-049 ([#56](https://github.com/Dillind/pawly-expo/issues/56)).

**Partly superseded by [ADR 0032](./0032-the-thread-is-its-own-screen.md).** The thread is no
longer the post screen — it is `posts/[postId]/comments.tsx`. The title of this ADR is now wrong on
that point. Everything else below still holds.

## Context

The comment icon on a Post had been decorative since posts shipped. The issue
that tracked it asked the right question first — whether a household of three or
four people, who already talk elsewhere, needs a comment thread at all.

The answer is that Likes already shipped and are used. A Like is the whole
social vocabulary the app currently has, and it can only say one thing. Someone
who wants to say "is that the new harness?" has nowhere to put it.

The reference is Hevy: a dedicated Comments screen, replies grouped under a
parent, a like on each comment, and a row of one-tap emoji above the composer.

Three questions had real alternatives.

**How deep does threading go?** Flat loses the ability to answer a person.
Unlimited nesting is the Reddit model and reads badly on a phone — every level
costs horizontal space a 390pt screen does not have.

**Who can remove a comment, and is there a filter?** Public user-generated
content needs a profanity filter, a report path and a block path — Apple's
guideline 1.2 requires them. This app has none of the conditions that make those
necessary.

**Does a comment interrupt anyone?** Likes deliberately do not push (ADR 0021).
The obvious move is to treat comments the same way.

## Decision

**Two levels, enforced in Postgres.** A comment is top-level or it is a reply to
one. Replying to a reply produces another child of the same parent, and
`reply_to_user_id` records who it answered so the row renders "@Sarah". A
`before insert` trigger refuses a third level and refuses a parent on a different
post — a check constraint cannot read another row, and the UI is not the only
thing that can insert one.

**Delete only. No edit, no hide, no filter, no report path.** A comment may be
deleted by its author, or by anyone who passes `private.can_manage_post` — the
post's author and the household's Owners, the same test that already governs a
post's photos and tags. Deleting a parent cascades to its replies.

**Comments push. Comment likes do not.** A `post_commented` alert goes to the
post's author and everyone who has already commented, never to the actor, as one
alert row per recipient. A `comment_liked` alert is queued with a
`suppressed_reason`, so it reaches the inbox and stops there.

**The thread lives on the existing Post Detail screen.** The full post card sits
above it, and the composer is pinned above the keyboard.

**Replies are always expanded**, with no "Hide replies" toggle.

## Consequences

**A comment alert names its recipients when it is queued, which no other kind
does.** Every kind before this carries a null recipient and is resolved at send
time (ADR 0012), so a preference changed between queue and delivery is
respected. That still holds — the preference is read at send time — but the
audience is not recomputed, because "the people in this conversation" cannot be
worked out later: a comment deleted in the meantime would silently drop someone
who was in it when it happened. `send-alerts` therefore honours `recipient_id`
when one is set, and comments ride the existing **Post Alerts** toggle rather
than adding a fourth preference.

**The push copy has three cases, not two.** A recipient can be in the thread
while owning neither the post nor the parent — they commented earlier — and
telling them a comment landed on "your post" would be untrue. `list_alerts`
returns `comment_is_reply_to_me` and `comment_post_is_mine` so the inbox and
the push agree on which sentence to use.

**There is no @mention and no username.** The prefix is rendered from the
`reply_to_user_id` column, never parsed out of the body, and it displays a first
name. It is styled but not tappable, because there is no member profile to open.
Usernames are [#103](https://github.com/Dillind/pawly-expo/issues/103), and when
they land the prefix changes its display string in one place — no schema change
and no backfill, because the pointer column ships now.

**If App Review ever objects to the missing report path, the answer is to build
it then.** The conditions that would make one necessary — strangers, a public
namespace, an audience the author did not choose — are all things this app
would have to add first, and the posts schema already refuses the first of them
by having no visibility column at all.

**The thread is unpaginated.** One request returns every comment on a post. A
household thread that outgrows one request is a good problem, and the ordering
is what makes the flat-to-nested pass in the service stable.
