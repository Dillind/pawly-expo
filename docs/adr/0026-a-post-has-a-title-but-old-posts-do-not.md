# 26. A Post has a title, but old Posts do not

Date: 2026-08-16

## Status

Accepted.

## Context

A Post had no name. The composer opened on an empty photo box and never said what you were making,
and the card led with a photo that had to speak for itself. A caption was optional and often absent,
so a Post in a list was frequently just an image with an author and a time.

Giving a Post a title fixes that. The question is what to do about the Posts that already exist.
None of them has a title and none of them ever will — nobody is going back to name a photo of a dog
from three weeks ago.

## Decision

**A title is required by the app and optional in the database.**

`posts.title` is nullable, with a `check` capping it at 80 characters. The Zod schema requires it,
both composer screens keep Post and Save disabled until it is filled, and `create_post` is only
ever called with one.

Nothing invents a title for history. Every read surface renders a Post whose title is null exactly
as it did before — `PostTitle` returns nothing, and the caption takes the top of the card.

**Editing an old Post has to name it.** The edit screen loads a null title as an empty field and
Save stays disabled until it holds something. This is the one place a member is asked for a title
they never wrote, and it is the right place: they are already editing.

**The title joins the `edited_at` comparison in `update_post`.** That function only issues an
`UPDATE` when something actually differs, so a title left out of the comparison would mean renaming
a Post did not count as an edit.

## Consequences

- The column can never be made `not null` without either deleting or back-filling old Posts. The
  requirement lives in two places, the schema and the two screens, and a future write path that
  skips both can create an untitled Post. `create_post` will accept it.
- A Post shows a title, a description, both, or neither, so `PostBody` has four shapes rather than
  two.
- `title` needed its own `grant update (title)` on `posts`. Column-level grants do not reject a write to a
  column left out of them in a `security invoker` function — they drop it, silently. `caption` was granted
  for the same reason in `20260810090000`.

## Alternatives considered

**`not null default ''`.** Every old Post would then have a title that is a lie about what its
author wrote, and the app would have to special-case the empty string anyway — the same nullable
check, spelled worse.

**Back-fill titles from the caption.** A caption is a sentence, not a name. Truncating one to 80
characters produces a heading nobody wrote and often one that ends mid-word.

**Leave the title optional in the app too.** That is the state this ticket exists to leave. An
optional name is a name most Posts do not have, which is exactly the problem.
