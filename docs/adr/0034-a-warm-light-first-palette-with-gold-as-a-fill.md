# 34. A warm, light-first palette, with gold as a fill and never as text

Date: 2026-08-30

## Status

Accepted. Supersedes the proposed palette in [PRODUCT_BRIEF](../PRODUCT_BRIEF.md), which was never
built. Fills in, and does not change, [ADR 0004](./0004-custom-theme-no-component-library.md).

## Context

Two palettes had coexisted since the start and neither was right.

The brief proposed teal, dusk blue and indigo. The code shipped a different teal, `#0F7173`, on a
cool grey page, `#F1F2F5`. Both documents carried a note saying to reconcile them in a design
session. Nobody did, for a year.

Meanwhile the app icon — the first thing anyone sees, and the only piece of the brand a user
actually looks at every day — is a pale cream crumpet on a marigold ground, about `#F5AC1B`. The
icon said gold. Everything else said teal.

Three directions were drawn on the real Home and Posts screens and all three were rejected, but the
reactions were informative. Gold on black read as an **alert**. Gold on the existing cool grey read
as cheap. Gold on a warm off-white read as **brand**. The problem had never been the gold. It was
the ground under it.

Splitting the token then exposed a second, worse problem. `colors.primary` was doing three
unrelated jobs across 45 call sites: a fill on buttons and tabs, a **text colour** on eight
`AppText color="primary"` labels, and an **icon colour** on fourteen glyphs. Teal could survive
that overloading. Gold cannot: `#F0A81C` on white is 2.0:1.

## Decision

**Light-first, and warm.** The page is `#FAF6EF`. Dark mode is a port of this palette, not a second
design.

**`primary` is a fill and nothing else**, `#F0A81C`, labelled with `onPrimary` `#2A1D06` — near
black, never white. A gold *label* is a separate token, `primaryText` `#9E6404`, which clears
4.5:1 where `primary` cannot. In dark mode the two collapse to one value; the call sites still use
both names, because a call site must not know which mode it is in.

**Gold has exactly three surfaces**: the Home banner wash, the Log chip, and the active tab. Gold
marks what needs doing.

**`success` `#10696B` is new**, and marks what is done. The tick used to be `primary`. It could not
stay, because a gold tick on every logged row would have put gold in fourteen more places and
drained the meaning from the three that matter.

**There is no identity palette.** A pet is told apart by its photo and a member by their avatar.

## Alternatives

**Keep teal, warm the page.** The cheapest option, and it fixes the cool-grey mismatch on its own.
Rejected because it leaves the icon disagreeing with every screen behind it. A brand colour that
never appears in the product is not a brand colour.

**Gold as the brand ground, a second colour for actions.** Gold owns the header and the empty
states; something else carries the buttons. Rejected because it needs two accent colours to explain
one app, and the second one has no story.

**Dark-first.** Agreed first, then reversed on evidence. Gold on black reads as a warning, and the
Posts feed — a third of the app, and photo-led — was the screen that made it obvious.

**Teal, blue and indigo, as the brief proposed.** Recorded here so it is not proposed again. It was
written before the icon existed and was never reconciled with it.

**Reuse `primary` for gold labels and accept the contrast.** Rejected outright. It is an
accessibility failure, not a taste question, and it fails silently.

## Consequences

**The palette change touched 24 files**, but almost none of it was a value swap. Splitting one
overloaded token across 45 call sites was the work, and each `Icon color="primary"` had to be read
and reassigned to `success`, `text` or `primaryText` by hand. There is no mechanical version of
this.

**Two bugs surfaced on the way through**, both invisible while `primary` was teal. `IconButton`'s
`secondary` variant was filled with `colors.error`, so every secondary icon button was a red
circle. `IconButton`'s loading spinner was a hardcoded `#ffffff`, which would have vanished on a
gold fill.

**A new gold surface is now a decision.** Anyone adding a fourth has to argue for it, and the
argument has to beat "this drains the other three".

**`MainButton` was re-specified** at the same time: fixed heights rather than vertical padding, all
radii fully round, and a smaller type ramp. The `xs` chip is 28pt tall and carries a `hitSlop` so
it still clears the 44pt tap target.

**Shadows are warm and single-layer.** The colour moved from `#0B0D12` to `#4A3A26`, because a
neutral grey shadow on cream reads as dirt. The design calls for two layers — a 1px contact shadow
under a soft spread — which React Native 0.86 can do with `boxShadow`. That is deferred until the
single layer has been judged on a device, since it also changes the Android elevation path.

**Dark mode is unproven.** It is a first-pass port, written to keep every `ThemeColor` key present,
and it has not been designed. Do not treat its values as settled.
