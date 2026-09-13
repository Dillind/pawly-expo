# Animation plans

Produced by the `improve-animations` skill on 2026-09-13, against commit
`752e7b1` on `feat/CRU-142-animated-splash-screen`.

The audit covered the 23 files in `src` that hold motion code. The standard is
already high — reduced motion is handled almost everywhere, the pinch and pan
gestures in `zoomable-photo.tsx` are genuinely good, and several files record
their trade-offs in comments. These five are the highest-leverage fixes found.

| #                                                        | Title                                                       | Severity | Status |
| -------------------------------------------------------- | ----------------------------------------------------------- | -------- | ------ |
| [001](./001-delete-dead-template-motion.md)              | Delete the dead Expo template motion files                  | HIGH     | DONE   |
| [002](./002-care-card-progress-off-the-layout-thread.md) | Animate the Care Card progress bar with scaleX, not width   | HIGH     | DONE   |
| [003](./003-splash-stops-holding-a-ready-app.md)         | Stop the splash holding a ready app, and fix its exit       | HIGH     | DONE   |
| [004](./004-own-the-animation-not-the-style.md)          | Drive two animations from shared values                     | MEDIUM   | DONE   |
| [005](./005-motion-tokens-and-one-tick.md)               | Give motion shared tokens, and make the two tick rows match | MEDIUM   | DONE   |

## Order

Run them in number order. 001 first, because deleting dead code shrinks what
every later plan has to read.

## Dependencies

There are none. No two plans touch the same file:

- 001 — `animated-icon.tsx`, `parallax-scroll-view.tsx`
- 002 — `care-card-editor.tsx`
- 003 — `animated-splash.tsx`
- 004 — `week-strip.tsx`, `pet-section.tsx`
- 005 — `motion.ts` (new), `occurrence-row.tsx`, `reminder-row.tsx`

Plan 005 creates `src/constants/motion.ts`. Later work should migrate the other
thirteen files to it, but that is out of scope here and is not a dependency.

## Verified on device

All five were exercised on an iPhone 17 Pro Max simulator (iOS 26.5,
`2C7C0E11-5A2F-4F61-9691-063BAC07C922`) on 2026-09-13.

- **001** — nothing rendered the deleted files, and nothing broke.
- **002** — the fill grows and shrinks from the left edge at every step, 1/9
  through 4/9, with its right end rounded and inside the track.
- **003** — the four heads pop and settle correctly, the darkened tabby reads
  against the gold, and under Reduce Motion the overlay leaves in 445ms without
  trapping.
- **004** — four taps in 400ms, each interrupting a 260ms slide, still land the
  underline exactly on the right day. A collapsed card shows its caret already
  turned at mount rather than rotating into place.
- **005** — both rows render unchanged. The tick animation itself was NOT seen:
  playing it needs a real feed log, which writes to the database and pushes a
  notification to the household.

Still unmeasured: the splash gold seam. Sampled from a simulator capture the
native layer reads `(245, 166, 16)` and the overlay `(240, 168, 28)`. That is
a real 5/2/12 gap, but a simulator capture cannot tell you whether the seam is
in the asset or in the screenshot. It needs a real phone.

## Not planned

Findings the audit raised and this set leaves alone, in rough order of value:

- `segmented-control.tsx:41` — the thumb spring runs 400 ms for what is a direct
  answer to a tap.
- `main-button.tsx:93` — press in and press out are both 100 ms with the default
  ease-in-out.
- `day-banner.tsx:63` — a 4 s infinite breathe on the most-visited screen, so the
  frame loop never idles there.
- `zoomable-photo.tsx:66` — zoom and pan stop dead at their limits with no
  rubber-band.
- ~~`gallery-strip.tsx:68` — under reduced motion the jiggle likely parks every
  tile at its end rotation instead of at zero.~~ **Wrong.** Checked on an
  iPhone 17 Pro Max with Reduce Motion on: the tiles hold square and still. The
  rotation stays at zero.
- `base-modal.tsx:47` — reduced motion sets the timing to 0, which removes the
  animation rather than gentling it.
- `crumpet-field.tsx:54` — the entrance uses the default ease-in-out.
- `accordion.tsx:19` — the chevron rotates over 280 ms, which is long for its
  size.
