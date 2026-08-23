# 32. The thread is its own screen

Date: 2026-08-23

## Status

Accepted. Supersedes one decision in
[ADR 0031](./0031-comments-are-two-levels-deep.md) — "the thread lives on the
existing Post Detail screen". Everything else in 0031 still holds.

## Context

ADR 0031 named Hevy as the reference and then diverged from it on this one
point. Hevy has a dedicated Comments screen; 0031 put the thread on Post Detail
instead, and made the comment icon inert there because the thread was already
below it.

Living with it showed the cost.

**A tappable control that does nothing is the wrong answer to "there is nothing
to navigate to".** The icon reads as a button on the feed and as decoration on
Post Detail, and nothing on screen explains the difference.

**One screen was carrying two jobs.** Post Detail is a photo carousel that wants
the full width and height, and a conversation that wants a pinned composer above
the keyboard. Reading the thread meant scrolling past a 300pt carousel every
time, and the composer sat under a screen whose main content was not text.

**A comment notification had nowhere precise to land.** It opened Post Detail
and the reader scrolled to find the comment they were told about.

## Decision

**Comments are `posts/[postId]/comments.tsx`**, a sibling of `index.tsx` in the
same folder — the convention that `home/[petId]/` already sets.

**The thread and the composer leave Post Detail entirely.** Post Detail keeps
the post and gains one row that opens the conversation, which reads "Add a
comment" when there are none. The comment icon now navigates from every place it
appears: the Posts feed, the Profile feed and Post Detail.

**The Comments screen carries a summary of the post, not the post.** Author,
date, title with a chevron back to the post, and the like row. The photos stay
behind. Repeating the carousel above the thread would push every comment below
the fold on the one screen whose whole job is the conversation.

**The empty state is the viewer's own avatar above "Be the first to comment".**
Hevy's, and it addresses the reader rather than describing a state.

## Consequences

**The comment push now points at `/posts/[postId]/comments`.** A push payload
embeds a route path, so `supabase/functions/send-alerts/message.ts` changed and
the Edge Function needs redeploying. **Deploy it after the app build ships, not
before** — a notification carrying the new path, opened on a build that has no
such route, is an Unmatched Route. Notifications already delivered keep the old
path, which still resolves.

**The full date replaces the relative time on this one surface.** "3d ago" is
right on a feed a reader is scanning; a conversation they were pulled into by a
notification is better anchored to a date. This is worth revisiting if it reads
as inconsistent beside the feed.

**A loop is possible and accepted.** Comments pushes Post Detail, which can push
Comments again. Hevy does the same. Making the chevron pop instead would be
wrong when the reader arrived from a notification and has no post underneath.

**The thread's own empty state is gone**, because the screen now owns it. The
composer and the reply target moved with the thread and are otherwise unchanged.
