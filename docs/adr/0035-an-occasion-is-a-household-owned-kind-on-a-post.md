# 35. An Occasion is a household-owned kind on a Post, and removing one is a soft delete

Date: 2026-09-02

## Status

Accepted. Replaces the design in [issue #124](https://github.com/Dillind/pawly-expo/issues/124),
"A post can be tagged as a milestone", which is closed unbuilt. Extends
[ADR 0017](./0017-household-scoped-posts-are-their-own-object.md).

## Context

A Post says what happened, but nothing on it says what *kind* of day it was. A vet visit and a walk
in the park read identically on the card. Issue #124 proposed the smallest possible fix: a
`is_milestone` boolean and a switch in the composer.

The switch is wrong for three reasons that only appear once you try to write the second one.

A boolean holds exactly one idea. The moment a household wants "Vet visit" beside "Birthday" it
needs a second column, then a third, and each one is a migration, a composer row and a card branch.
There is no version of that which ends.

A fixed enum in the app is the obvious next step, and it fails differently. Crumpet does not know
what a particular household's year looks like. A working dog's calendar is trials and vet checks; a
rescue's is the adoption day and the first time she slept through the night. An enum written here
is a guess about people we have not met.

And a per-member list would fracture the vocabulary. Two members of one household would write "Vet"
and "vet visit" for the same thing, and the Posts tab would show both.

## Decision

**An Occasion is a row in an `occasions` table, scoped to a Household.** It carries an emoji, a
label, or both — never neither, enforced by the `occasions_carry_something` check constraint rather
than by the composer. A Post carries at most one, through a nullable `occasion_id`.

**Six are seeded on Household creation** by an after-insert trigger: 🎉 Milestone, 🏥 Vet visit,
🎂 Birthday, 🏡 Adoption day, 🎓 Training, 🛁 Bath. Every one is editable and removable. They are a
starting vocabulary, not a fixed enum wearing a table.

**Removing one is a soft delete.** `deleted_at` is stamped, the row leaves the picker, and every
Post already carrying it keeps it. `authenticated` holds **no delete grant** on the table, so this
is a database guarantee and not a convention the client agrees to follow.

**Any Member may add, rename or remove one**, not Owners only.

**The chip wears the Pet Tag's clothes** — the same pill, the same fill, the same 13pt secondary
label, with the emoji standing exactly where a Pet's avatar stands. It joins the Pet Tag row rather
than sitting beside the title.

**The emoji picker is a curated `EMOJI_OPTIONS` constant**, not a keyboard package.

## Consequences

**A Post is a record of a day, and stays one.** This is the whole reason for the soft delete. A
household that outgrows "Training" and removes it has changed what it will write in future; it has
not changed what it wrote in March. The alert on remove names the count for exactly that reason —
"It leaves the picker. The 4 posts that carry it keep it." — because that is the fact the decision
turns on.

**Any Member can rename the household's vocabulary, and a rename is visible everywhere at once.**
This was the trade-off with real weight. Owner-only editing would protect the set, at the cost of a
Contributor who can tag a Post with an Occasion but cannot add the one they actually need — and
that member is the person most likely to be at the vet. A renamed pill is a smaller failure than a
member who cannot describe the day they had. Revisit this only if a household reports it, and the
fix is then a role check on update, not on insert.

**A cross-household leak is closed in the policy, not in the RPC.** The insert and update policies
on `posts` both test `private.is_occasion_in_household`, because a Member of two households could
otherwise put one household's Occasion on the other's Post — the same class of leak the Pet Tag
policy already guards against.

**The picker's order is the household's own.** `sort_order` is set when a row is created and never
recomputed, so a new Occasion lands at the end rather than jumping into the middle of a set the
household has already learnt. Reordering is not built; if it is ever wanted, it is a drag handle
over an existing column.

**No emoji library, and none is needed.** `ios/Podfile` pins the deployment target to 16.4, and iOS
16.4 ships Emoji 15.0. Every glyph in `EMOJI_OPTIONS` is Emoji 14.0 or below, so there is no
rendering problem for a package to solve. The one maintained option, `rn-emoji-keyboard`, last
published in 2024, carries a 2022 data set, and sets state from a render body — which React
Compiler, enabled in `app.json`, cannot survive. The full comparison is in
[`docs/research/emoji-picker-expo-57.md`](../research/emoji-picker-expo-57.md).

**Filtering the feed by Occasion is deliberately not built.** Every household currently holds the
same six seeded rows, so a filter would sort nothing. It earns its place once households have
Occasions of their own.
