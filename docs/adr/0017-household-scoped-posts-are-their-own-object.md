# 17. Household-scoped Posts are their own object

Date: 2026-08-09

## Status

Accepted

## Context

PRODUCT_BRIEF listed a social feed under Out of Scope, describing it as "the 11pm-build-session
temptation". That entry was written against a public social product — profiles, a follower graph,
strangers, discovery — and it stays banned. It does not describe what a household actually needs.

The need is narrower and it has one shape: somebody goes away and leaves the pet with a partner,
a housemate or a paid sitter. Feed Logs tell them the pet was fed. They do not tell them the pet is
happy. The current alternative is texting the sitter to ask for a photo, which is awkward enough
that people do not do it.

What makes an in-app answer better than the group chat is not that it replaces messaging. It is that
everyone with a relation to the pet is already here. The sitter does not have to be added to a
family thread, and nobody has to ask.

Two shapes were available for the content itself.

- **Enrich the Feed Log.** No new object: a Feed Log gains a photo and a longer note, and the card
  is the log. Every post is a feed, so a walk cannot be posted.
- **A separate object.** A Post is authored deliberately and carries a photo. It has nothing to do
  with feeding.

The second costs more. Nothing auto-posts, so the surface can be empty for days, where an enriched
Feed Log would fill it three times a day for free.

## Decision

**A Post is its own object.** It is not an enriched Feed Log, it does not write to `feed_logs`, and
`log_feed` is untouched. A Post carries one required photo, an optional caption, and an
`occurred_at` the author may backdate up to seven days.

**A Post is scoped to the Household, permanently.** Visibility follows household membership and
nothing else. There is no `visibility` column, no audience model, and no per-post privacy control.
Public sharing would need a follower graph, a block list, a report queue and a moderation budget; a
nullable enum buys none of that and makes every RLS policy reason about a case that cannot occur.

**Audience and subject are different things.** The household decides who can see a Post. Pet tags
describe what is in it — optional, multi-select, stored in a `post_pets` join table, never
pre-selected. Tagging a pet narrows nothing.

## Consequences

The stream can be empty, and the empty state carries that weight rather than apologising for it. A
household that posts nothing for a fortnight is a household using the app correctly.

Feeding and sharing stay separable. The Double Feed guard, the Grace Window arithmetic and the
missed-feed sweep are untouched by anything in this ADR, and a bug in one cannot reach the other.

Delivery follows ADR 0012: an insert queues an `alerts` row and the outbox decides. One rule differs
deliberately. A Feed Log older than 30 minutes at insert becomes a Suppressed Alert, because a stale
"Sarah fed Bailey" is noise about something already handled. **A backdated Post still pushes** — a
photo from three days ago is still a photo you want to see. Same mechanism, opposite answer,
because the content is not the same kind of thing.

Moderation is membership. The author deletes their own Post, an Owner deletes any, and removing a
member is the block. There is no report button, because there is nobody to report to and offering
one would imply a moderation team that does not exist. For App Review: all content is visible only
to members of a private, invite-only household.

Because pet tags are stored from the start, a per-pet Posts view is additive whenever it is wanted.
It is not in v1 — a filter over an empty stream is wasted work.
