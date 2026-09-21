# 42. The Care Card is an object, not a page

Date: 2026-09-21

## Status

Accepted. Overturns the "The care card is a route, not an overlay" entry in
[DECISIONS.md](../DECISIONS.md), which is rewritten in the same change. Extends
[ADR 0034](./0034-a-warm-light-first-palette-with-gold-as-a-fill.md), which is amended to name the
card front as a gold surface.

## Context

CRU-055 built the Care Card as an ordinary pushed screen: a large title, a `Stack.Toolbar`, and the
filled sections listed down the page. It replaced an earlier design — a gold card that grew out of
its tile and turned over to show its contents — and the reason given was that a sitter wants every
section at once, and a face they had to turn over hid half of them behind an animation.

That reasoning was sound against the design it rejected, and the design it rejected is not the one
in front of us now. Two things are different.

The old back showed **some** sections. This one shows **every** section, filled or not, as a single
scrolling list. Nothing is behind a second tap; the whole card is behind one turn. And the earlier
version had no repair path from the back at all — a wrong phone number sent you through a nine-step
wizard. This one opens that section's own fields in a Tray.

The second difference is what the screen is for. A Care Card is not a page of the app. It is the
thing you hand to whoever is looking after your dog, and the product's whole claim is that it is
one object a sitter can hold rather than a settings screen they have to learn. A page that looks
like every other page in the app does not make that claim. A card does.

`Link.AppleZoom` landed in Expo Router 57 and makes the tile grow into the card as a real UIKit
fluid transition rather than a JS approximation, which is what makes the object read as continuous
rather than as two screens that happen to share a colour.

## Decision

**The Care Card screen is one card object, not a page.** The route name `home/[petId]/care-card`
does not change — a notification could still reach it — but the screen inside it has no native
header and no page chrome. It is a single card, inset 20pt either side, over a dark blurred wash of
the Pet screen it came from, with one round `×` beneath it.

**The tile zooms into the card.** `Link.AppleZoom` via `withAppleZoom` on `Link.Trigger`, with no
`Link.AppleZoomTarget`, so the zoom fills the destination. The tile had to become a real `Link` —
`withAppleZoom` throws inside anything else.

**The card has two faces and turns on its Y axis.** The front is the gold slab: the lockup, the
pet's photo and name, and the one number a sitter rings at 2am. The back is a pale cream face
carrying **every** section as one scrolling list. Reduce Motion cross-fades the two rather than
rotating.

**A section is repaired in a Tray, never in the wizard.** Tapping a row on the back opens that
section's own fields, saves through the existing mutation, and closes. The nine-step wizard survives
for exactly one job: the first fill of an empty card.

**The two faces keep their colours in both modes.** Gold `#F0A81C` with `#2A1D06` ink, cream
`#FBEED2` with the same ink and `#6B5A3D` beneath it. A physical object does not repaint itself at
dusk, and the wash behind it is what carries the theme.

## Alternatives

**Keep the page, as CRU-055 decided.** The cheapest option and the one already shipped. It has a
real back button, a URL, a large title, and a toolbar that iOS draws for free. Rejected because the
card is the product's one distinctive artefact and the page renders it as a settings screen. The
argument that made the page win — that a turn hides half the content — no longer holds against a
back that carries all of it.

**A card front with no back at all: every section on one gold face, scrolling.** Keeps the object
and drops the flip, so there is no `rotateY` risk and no second tap of any kind. Rejected because a
sitter's one-glance needs (the photo, the name, the emergency number) and their reading needs (nine
sections of prose) want opposite layouts, and one face serving both serves neither. The flip is what
lets the front stay almost empty.

**Keep the flip but make the back a pushed screen.** The front is the card, the back is the page we
already have. Rejected because it is two mental models for one object, and the transition between
them is a push, which says "somewhere else" exactly where the design needs "the other side of this".

**A modal presentation rather than a zoom.** Works on every iOS version we support rather than 18+
only. Rejected because on 16 and 17 the route simply pushes and that is a perfectly good screen —
paying for a second presentation path to avoid a graceful degradation is the wrong trade.

**Open the wizard for a repair.** No new Tray code, and the wizard already validates every field.
Rejected outright: walking nine steps to fix one phone number is the complaint the redesign exists
to answer.

## Consequences

**`expo-blur` is a new native dependency**, so the wash is inert until a fresh dev client is built
and installed on every machine. Typecheck and Jest cannot see this — see
[KNOWLEDGE.md](../KNOWLEDGE.md).

**Apple Zoom's interactive dismissal is switched off.** The card's back is a scroller and the two
gestures fight, so `usePreventZoomTransitionDismissal` fences the dismiss region to nothing and the
`×` is the only way out. It is always drawn, on every iOS version, for that reason.

**On iOS 16 and 17 there is no zoom.** The route pushes normally and the card is still a card. No
second path is built.

**`CareCardSections` is no longer used by the screen.** It still draws the same data for the
editor's review step, so it stays.

**The shared `Tray` was not changed.** It hard-codes `detents={['auto']}` and its step has no
scroller, so a section with two long answers is split one field per step instead —
`watch-for` and `around-the-house` each became two. That is a constraint the Tray imposes on its
callers, and the alternative was giving every tray in the app a scroll it does not need.

**A Contributor keeps share, help and the flip, and loses the chevrons.** The rows still read; they
just do not open.
