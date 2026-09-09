# 36. A Follow is a household-scoped read plus a voice

Date: 2026-09-10

## Status

Accepted. Builds on [ADR 0017](./0017-household-scoped-posts-are-their-own-object.md),
[ADR 0020](./0020-an-invite-is-delivered-in-app-and-keyed-to-an-email.md) and
[ADR 0012](./0012-recipient-controlled-alert-delivery-and-the-outbox.md).
Implements [issue #125](https://github.com/Dillind/pawly-expo/issues/125).

The discovery half is under review. See "What is still open" at the end.

## Context

Until now a person saw a household's Posts only as a Member. Membership is the wrong price for an
audience. A grandparent who wants to see the dog does not need to log feeds, does not need the Care
Card, and must never be counted as a carer. The household would also have to hand them a seat, and
a seat is revocable but heavy.

The app already had one way to let somebody in, the Invite. An Invite grants membership, is keyed
to an email, expires and is single use. Reusing it for an audience would mean a third role, and a
role is a permission set on the household's working life. That is the thing we are trying not to
widen.

So the question is not "what role is this person?" but "what can a person read who is not in the
household at all?".

## Decision

**A Follow is a row in `household_follows`, on a Household and never on a Pet.** A Pet moves
household. A pet-level follow would need its own accept flow and would multiply the policy surface
of every table a Pet touches.

**The Owner accepts.** A request is `pending` until an Owner responds. A Contributor cannot respond,
so a Contributor is not told about the request either — an alert that carries no action is noise.
Every write goes through a `security definer` RPC and `household_follows` carries no INSERT, UPDATE
or DELETE policy at all. "Only an Owner accepts or removes" is therefore a database guarantee, not
a habit of the UI.

### The read boundary

**A Follower reads what the household chose to publish, and nothing about care.**

Widened to `private.can_read_household`, or one of its per-row wrappers:

| Table           | Why                                                 |
| --------------- | --------------------------------------------------- |
| `posts`         | The thing they came for                             |
| `post_photos`   | The images on it                                    |
| `post_pets`     | The Pet Tag chips on the card                       |
| `post_likes`    | The count, and their own Like                       |
| `post_comments` | The Thread, and their own Comment                   |
| `comment_likes` | The count on a Comment                              |
| `pets`          | Name, breed and bio — the Pet Profile               |
| `pet_photos`    | The gallery on that profile                         |
| `households`    | The name on a Post header and on the landing screen |
| `users`         | Who wrote the Post, and who commented               |

Untouched, and keeping their membership test: `feed_times`, `feed_logs`, `reminders`,
`pet_pauses`, `care_cards`, `household_members`, `household_invites`, `occasions`, `alerts`.

That is the line. A Post is published. A feeding schedule is the household's working life.

**The design first named four tables. It undercounted.** Ten policies were needed, because a Post
card is more than a row in `posts`. The count is recorded here so the next reader trusts the table
above and not the sentence that preceded it.

**One predicate holds the boundary.** Every widened policy calls `private.can_read_household`
rather than restating the union, so the line can only move deliberately and in one edit.

**A policy body may only test the row in front of it and call a definer function.** A join written
inline in `using (...)` runs as the querying user and is filtered by the joined table's own policy.
A Follower is not in `household_members`, which is the whole point of a Follower, so an inline join
returns nothing and every Post renders authorless. This is written up in `docs/KNOWLEDGE.md`
because the SQL looks correct, applies cleanly and passes typecheck.

### A voice, not a seat

**A Follower can Like and Comment.** A read-only audience makes the household talk to a wall, and
the grandparent's reply is the reason the photo was posted. Moderation already exists and needed no
change: a Comment is deletable by its author, by the Post's author and by an Owner.

**A Follower has no screen of their own.** No route in the app takes a user id. `can_see_user` lets
a name and an avatar render beside words that person wrote in the open, and nothing more. Two
Followers of one household can see each other for exactly that reason, and for no other.

### Ending it

**An unfollow deletes the row.** It is routine and repeatable, and the person may follow again.

**A removal by the Owner sets `removed` and the row survives.** That is the block: the unique index
over `(household_id, follower_id)` leaves nowhere for a second row to go, so the next request from
that person cannot be written and the Owner never sees the request. `request_follow` answers
`blocked` in the same shape it answers an ordinary failure, so a removed person learns their request
went nowhere, never that they were removed.

**A decline deletes the row.** Declining is not removing. It refuses this request, and the person
may ask again.

**A removed Follower's Likes and Comments stay.** A Comment is half of a thread the Members replied
to, and removal governs future access rather than erasing the past. This is also why a removed
Follower stays visible to `can_see_user`: hiding the user row would leave those Comments authorless.
The block works through `household_follows`, and both of the Owner's lists filter on status, so a
removed person appears in neither Followers nor Requests.

**Membership wins over a follow.** A trigger on `household_members` deletes the follow when a
Follower is invited in. Nobody holds both.

### Notifications

**One alert, and it runs towards the household.** A follow request tells the Owners. Nothing tells
the Follower — not the accept, not a new Post. They find the posts the next time they open the app.
Telling a Follower "you were accepted" is the first step into the notification volume this feature
is built to avoid.

## Consequences

**The Posts tab now holds two scopes.** Posts from Households the viewer is a Member of, and Posts
from Households they follow. The filter names which. A Member acts in the Active Household and
reads across all of them, and a followed Household is read-only inside that same stream.

**A Follower is not a Member and no count may treat them as one.** Anything reading
`household_members` keeps working unchanged, which is the point, but it also means a per-household
audience number has to come from `household_follows`.

**Every new table has to answer the boundary question.** Adding a table means deciding which side of
`can_read_household` it sits on. Choosing wrong is silent: the Follower simply sees more than they
should.

**pgTAP is the only thing in the repository that runs a policy.** The boundary is not testable from
Jest. `supabase/tests/follow.test.sql` found the inline-join failure above.

## What is still open

**Discovery is a link and nothing else.** `crumpetapp://follow/<householdId>`, shown as a QR code
and a copyable string. The link grants nothing, so it needs no table behind it and does not expire.
There is deliberately no search, because a search over household names would leak the existence of
private households.

A link is a poor way to find a household you were told about in conversation. The alternative under
discussion is a **handle on the Household** — a unique, searchable, human-typed name — which would
make discovery a search rather than a hand-off. That would also move Username down from the User to
the Household, or add a second handle beside it. Nothing above changes if it lands: the read
boundary, the accept and the block are about the relationship, not about how it starts.
