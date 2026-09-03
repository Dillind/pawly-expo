# 18. A Post is editable by its author alone

Date: 2026-08-11

## Status

Accepted. Reverses the "no edit in v1" position recorded in ADR 0017 and in
`20260809090000_posts.sql`.

**Point 3 below — "the photo is not replaceable" — is superseded by
[ADR 0019](./0019-a-post-carries-up-to-ten-photos.md).** Everything else here still
holds, including the author-only rule that 0019 extends to `post_photos`.

## Context

Posts shipped without editing, deliberately. The reasoning is worth restating because it
was not wrong:

> There is no edit in v1 — delete and repost. Editing needs an `edited_at` and a marker on
> the card, so that comments (deferred, not cancelled) cannot be made nonsense by a later
> rewrite. Worth building once, with comments.

The hazard is real. A comment answers the caption it was written under. If the caption can
change afterwards with no trace, the reply survives as an answer to a question nobody
asked, and the reader has no way to tell.

Two things changed. Delete-and-repost turns out to be a bad trade for a typo: it destroys
the Likes, moves the Post to the top of the Household stream, and re-notifies everyone —
three visible consequences for fixing one word. And the card now carries a comment icon,
so comments are nearer than they were, not further away.

That leaves a second question the first one hides. Deleting and editing are not the same
permission. An Owner can already delete a Member's Post, which is moderation: it is
visible, it is attributable, and what it leaves behind is nothing. Rewriting a Member's
words, under that Member's name and avatar, is a different act — and the card gives the
reader no way to see it happened at all.

## Decision

**An author may edit their own Post's caption and Pet Tags. Nobody may edit anyone
else's — not even an Owner.**

The card's single `canManage` boolean splits accordingly:

|             | Edit own | Delete own | Edit others' | Delete others' |
| ----------- | -------- | ---------- | ------------ | -------------- |
| Contributor | yes      | yes        | no           | no             |
| Owner       | yes      | yes        | **no**       | yes            |

Four things follow, and all four are load-bearing:

1. **`edited_at` ships with the edit, not after it.** Retrofitting it once Posts exist in
   the wild leaves a generation of rows that cannot be told apart from unedited ones. The
   card shows an "Edited" marker beside the timestamp.
2. **`edited_at` is set by a trigger, never by the client.** A client-supplied timestamp
   is a claim; this is a fact, and it is precisely the field a rewriter would want to
   leave alone. The client's `UPDATE` grant covers `caption` and nothing else, so an edit
   cannot move a Post in the stream, hand it to another Household, or reassign authorship.
3. **The photo is not replaceable.** Replacing it means a second upload and an orphaned
   storage object, with the row already rewritten by the time the upload fails. An edit
   changes what a Post _says_, never what it _shows_.
4. **`post_pets` becomes author-only too.** Its write policy used
   `private.can_manage_post`, which includes Owners — so an Owner could already change the
   Pet Tags on a Member's Post. That was unreachable only because no edit UI existed to
   reach it through. Tags are part of what a Post says, so they follow the same rule.

Caption and tags change together through one `update_post` RPC, for the reason creation
goes through `create_post`: three client statements can leave a Post carrying the new
caption and the old tags, with nothing to roll back to. It is `security invoker`, so the
policies stay the authorisation rather than being restated in the function body.

## Consequences

`edited_at` marks a Post edited only when something actually changed. The RPC compares the
caption and diffs the tags, and issues no `UPDATE` when both match — otherwise typing a
word and deleting it again would brand the Post Edited. The check cannot live in a trigger
`WHEN` clause alone, because a tag-only edit never touches the `posts` row.

**An Owner faced with a Member's misleading caption has one lever, and it is the blunt
one: delete.** That is the intended outcome. A moderator who can silently rewrite what
somebody said is a worse property for a shared household album than a moderator who can
only remove.

**The "Edited" marker is the whole audit trail.** There is no revision history and no
"see original". For a household of two to four people that is proportionate; if Posts ever
leave the Household — which ADR 0017 says they must not — it would not be.

**When comments arrive they inherit a caption that can move underneath them.** The marker
is what keeps that honest, and it is why it had to exist before the first edit, not before
the first comment.
