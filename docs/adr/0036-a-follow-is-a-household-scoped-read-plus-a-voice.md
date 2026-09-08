# 36. A follow is a household-scoped read, plus a voice

Date: 2026-09-08

## Status

Accepted. Replaces the Viewer role proposed in
[issue #84](https://github.com/Dillind/pawly-expo/issues/84), which is closed by this.
The public-household variant is [issue #169](https://github.com/Dillind/pawly-expo/issues/169) and
comes after.

## Context

You can only see the households you are a member of. Sometimes you want to watch someone else's
pets — a friend's puppy, a family dog — with no share of the responsibility for them. The first
answer to that want was a third role, Viewer, sitting inside the household next to Owner and
Contributor. That answer was wrong in a way worth writing down: a seat in a household is a
statement about care, and a person who watches is not caring for anything. Every gate in the app
would have had to learn a role that means "in, but not really in".

The second answer is a follow, which sits outside the household entirely.

Two things then have to be decided at once, and they pull against each other.

**How much a follower sees** is an RLS question, and RLS is the expensive thing to change later. A
boundary drawn too wide leaks a Care Card. A boundary drawn too narrow makes the feature pointless.

**What a follower can do** is a product question. `PRODUCT_BRIEF.md` puts a social feed out of
scope. A read-only follow honours that line most safely, and produces a feed nobody responds to —
which is the failure mode that kills the feature quietly rather than loudly.

## Decision

**A follow is on a household, never on a pet.** A pet-level follow multiplies the RLS surface,
needs its own accept flow, and breaks the day a pet moves household
([#46](https://github.com/Dillind/pawly-expo/issues/46)).

**The boundary is posts and pet profiles.** A pet profile means name, photo, breed, bio and the
gallery. Never feeds, never schedules, never reminders, never the Care Card. Those four are the
household's working life, and a follower is not part of it.

**A follower reads, likes and comments. Nothing else.** The interaction is the point. It stops
exactly there: no follower-to-follower surface, no profiles of followers, no mentions.

**The relationship is exclusive.** One row per person per household, so a member cannot also be a
follower of the same household. Leave a household and then follow it — that is the path that
matters, and it is a real case.

**Every household is private and every follow needs an accept.** Discovery is a share link only.
Search over household names would leak the existence of private households.

**Only an Owner accepts or removes**, through an RPC, with no write policy on the table at all.
This copies `household_invites` exactly.

**The two ends of a follow are different events.** An unfollow is clean and repeatable. A removal
by the Owner blocks the next request. One `status` column carries all three states — `pending`,
`accepted`, `removed` — so a `removed` row silently fails the next request and the Owner never sees
it again.

**Removal does not erase.** The removed person's likes and comments stay. An Owner who wants one
comment gone deletes that comment.

**A follower gets no push in v1.** Members get two new ones: a follow request to the Owner, and a
comment to the post author.

**The follower's pet screen is a separate route.**

## Consequences

**The policy change is small, and that is the evidence the boundary is in the right place.** Only
the select and insert predicates on `posts`, `post_photos`, `post_likes` and `post_comments` widen,
from `private.is_post_household_member(post_id)` to "a member, or an accepted follower". The delete
policy on `post_comments` needs no change at all — it already tests `author_id = auth.uid() or
private.can_manage_post(post_id)`, and neither branch mentions membership. So a post author and an
Owner can moderate a follower's comment from the first day, without a line being written for it.

Nothing on the care side is touched. `feed_logs`, `feed_times`, `reminders`, `care_cards` and
`pet_pauses` keep membership-only policies, and a follow cannot reach them by any path.

**A follower learns which member wrote each post.** `POST_SELECT` embeds `users`, so the author's
username and avatar travel with the post. That is a real disclosure and it is accepted: a post is
written to be read.

**The pet screen is duplicated, on purpose.** `home/[petId]/index.tsx` is built on the active
household rather than on the pet's household — `useHousehold`, `useHouseholdMembers`, `usePetPause`
and a `!timezone` guard that never resolves for a household the viewer is not in. Making that
optional would mean four conditional hooks on the one screen that carries feeds, reminders and the
Owner controls, and a mistake there shows a follower a feed schedule. The follower's screen asks
one query and renders four things, so it cannot leak what it never requests. The duplication is the
cheaper mistake.

**Home stays member-only.** A followed household must not enter the household switcher, because
Home is the care surface. A person who follows one household and joins none still lands on
`no-household-state.tsx`, whose copy tells them to create or join. That copy is now wrong for them
and needs a second variant.

**The block has no unblock screen yet.** The `removed` row is a deliberate dead end in v1. The data
is there the day someone wants a list.

## Alternatives considered

**A Viewer role inside the household.** Rejected above, and closed as #84. It puts a person who
takes no responsibility into the structure that exists to divide responsibility, and every
role check in the app pays for it forever.

**A read-only follow.** Safer against the `PRODUCT_BRIEF.md` line, and the earlier position. It was
overturned deliberately: the household gains nothing from an audience it cannot hear, and a silent
feed is abandoned rather than argued about. The line is held by scope instead — likes and comments
on posts, and nothing that makes followers visible to each other.

**A follow on a pet.** The more natural mental model, and the one users would describe. It loses on
mechanics: two accept flows, a much larger policy surface, and no answer for a pet that changes
household.

**Deletion of a removed follower's content.** Rejected. It edits threads that members took part in,
to punish a person who can no longer read them.
