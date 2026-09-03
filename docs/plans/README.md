# Plans

Working plans for changes that are too large to hold in a commit message.

`CRU-066-feeds-rework.md` is a feature plan and is not indexed below.

## Animation plans

Written by the `improve-animations` skill. Each one is self-contained: an
executor needs the plan file and the repo, and nothing from the conversation
that produced it.

Source of the values: `.claude/skills/improve-animations/AUDIT.md`.
Source of the opportunities: a `find-animation-opportunities` sweep at commit
`0298ba5`.

| #                                               | Title                                              | Severity | Status |
| ----------------------------------------------- | -------------------------------------------------- | -------- | ------ |
| [001](./001-occurrence-row-log-confirmation.md) | Animate the feed-log confirmation on OccurrenceRow | MEDIUM   | DONE   |

## Execution order

Run 001 on its own. It has no dependencies and touches one file.

## Not yet planned

The sweep found four more opportunities. None is planned yet.

1. `src/components/ui/action-popover.tsx:96` — the bubble has no spatial link to
   its trigger. Needs a device check first, because the iOS 26 glass material
   may already carry part of the effect.
2. `src/components/ui/comment-thread.tsx:32` — a new comment appears after a
   network round trip with no bridge.
3. `src/components/ui/post-action-row.tsx:45` — the like heart has no feedback.
4. `src/lib/form/components/field-error.tsx:10` — an error message makes the
   field below it jump.

## Known debt this exposes

Motion durations are private constants in five separate files:
`main-button.tsx` (100), `pet-section.tsx` (220 and 160), `accordion.tsx` (280),
`segmented-control.tsx` (a 400 ms spring), and now `occurrence-row.tsx` (220).
A sixth animation makes drift certain. Consolidating them into
`src/constants/theme.ts` is worth doing before any more of the list above.
