# 19. A Post carries up to ten photos, and its author can change them

Date: 2026-08-11

## Status

Accepted. Reverses point 3 of [ADR 0018](./0018-a-post-is-editable-by-its-author-alone.md),
which said the photo is not replaceable.

## Context

ADR 0018 gave authors the caption and the Pet Tags and stopped there:

> **The photo is not replaceable.** Replacing it means a second upload and an orphaned
> storage object, with the row already rewritten by the time the upload fails. An edit
> changes what a Post _says_, never what it _shows_.

The objection is real and the ordering problem it describes is real. What it missed is that
the same paragraph of ADR 0018 already rejected the only remaining remedy. If the photo is
wrong, the author's one option is delete and repost — and 0018 established that this
destroys the Likes, moves the Post to the top of the stream, and re-notifies the Household.
Those three consequences were judged too high a price for fixing a typo. They are not a
lower price for fixing a photo.

Meanwhile `post_photos` has been a child table with a `sort_order` since the first posts
migration, which said so in as many words:

> Photos live in a child table from day one even though v1 writes exactly one row and
> renders a single square image. A carousel then costs a client change and nothing else.

So the schema was never the obstacle. The obstacle was the write ordering, and that has an
answer.

## Decision

**A Post carries between one and ten photos, and its author can add, remove and reorder
them.** A Post with no photo remains impossible.

**The array is the whole desired state, not a list of changes.** `create_post` and
`update_post` take an ordered `text[]` of storage paths and work out the difference
themselves. A caller that miscounts what it added cannot leave the row and the objects
disagreeing, and the display order falls out of the array index instead of needing its own
channel.

**Upload first, RPC second, delete last.** This is the whole answer to 0018's objection.
The failure it describes — a rewritten row pointing at an upload that did not land — is a
consequence of the _order_, not of replacement being impossible. Run it the other way and
the worst case is an object nothing references: wasteful, invisible, and recoverable. The
reverse is a Post rendering a broken image, which is neither.

**Photo edits stage until Save.** The editor is a form with Cancel and a "Discard your
changes?" alert. Mutating on tap would make that alert a lie, and would confirm each change
with its own toast. Removing a photo that is already on the Post asks first, because it is
destroyed on Save; removing one picked ten seconds ago does not, because re-picking it is
trivial and an alert for a plainly undoable action is the surface AGENTS.md rules out.

**The cap is ten, and it is enforced in `assert_post_photo_paths`.** The Zod schema carries
the same number for the form's sake, but a cap that lives only in the client is a cap the
next caller ignores.

**`post_photos` becomes author-only**, exactly as `post_pets` did in ADR 0018 and for the
same reason. Its policy still used `private.can_manage_post`, which includes Owners. That
was unreachable while nothing could edit a photo. It is reachable now, and an Owner who may
delete a Member's Post still may not rewrite what it shows.

## Consequences

**Posted photos are no longer square.** `allowsEditing` and `allowsMultipleSelection` are
mutually exclusive in the picker, so a multi-select pick cannot crop. The card draws every
photo into the same square frame with `cover`, which centre-crops a portrait shot. A pager
whose frame changed per page would lurch on every swipe, so the fixed frame is the lesser
cost — but it is a real one, and a tall photo of a dog can lose the top of its head. If
that proves bad on device, the fix is Instagram's: clamp to the first photo's aspect ratio
between 4:5 and 1.91:1 and let the frame vary per Post rather than per page.

**"Edited" now covers what a Post shows, not only what it says.** ADR 0018 drew that line
deliberately and this erases it. The marker still tells the reader something changed and
still cannot say what — but the set of things it might have been is now larger, and a
comment can be left stranded by a photo swap as easily as by a caption rewrite. The marker
was already the whole audit trail; it is now carrying more weight than it was designed for.
Revisit it when comments ship, not before.

**Reordering alone counts as an edit.** The order is part of what the Post shows, so
shuffling two photos stamps `edited_at` even though the set is identical. Rows are
re-ordered in place rather than dropped and re-inserted, so a photo keeps its id and
`created_at` across the shuffle.

**Orphaned storage objects are now possible.** Cleanup is best effort in three places: a
failed upload part-way through a batch, a failed RPC after a successful upload, and the
delete of photos dropped by a successful edit. Each logs and moves on. The alternative —
failing the user's edit because a file could not be tidied up — undoes work that actually
landed.
