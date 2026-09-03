# Auth screen: a drifting field of crumpet-pet stickers

Research for the Crumpet sign-in screen. The reference is the Family wallet app: a dense, full-bleed
field of flat vector character stickers drifting behind a headline and two buttons. Researched
2026-09-03 against Expo SDK 57, React Native 0.86.2, Reanimated 4.5.1, react-native-svg 15.15.4.

---

## Bottom line

Build the drift with **pre-rendered WebP/PNG sprites in `expo-image`, each wrapped in an
`Animated.View` running a looping translate/rotate/scale in Reanimated**. It costs nothing new — no
dependency, no build change, no bundle weight beyond the art itself — and 20–40 wrapper views with
transform-only animations is well inside what the New Architecture handles at 60fps. Do **not**
render 30 multi-path SVGs; the art is static, so `react-native-svg` buys you nothing and charges you
one native shadow node per path. If the screen later wants real depth — parallax, per-sprite blur, a
gradient wash, shader tinting, or more than ~40 sprites — move to `@shopify/react-native-skia`'s
[`<Atlas>`](https://shopify.github.io/react-native-skia/docs/shapes/atlas/), which is purpose-built
for exactly this (one texture, one draw, transforms animated in a worklet at "near-zero cost") at a
cost of about 6 MB of iOS download. On the art: **hire an illustrator.** A bespoke crumpet-with-a-pet
character set is the entire point of the screen, no marketplace pack contains it, and the realistic
Australian spend is **AUD 2,500–6,000 for 5–8 characters** or **AUD 8,000–20,000 for 15–25 plus a
style guide**, with full commercial buyout. That is the cheapest distinctive brand asset the app will
ever buy, and it is the one job on this screen a solo developer should not do themselves.

---

## 1. Rendering approach

### The shape of the problem

A sticker field is not one animation. It is N independent, slow, looping rigid-body transforms over
N static images. Nothing morphs. Nothing is on a timeline. Nothing is interactive. That framing
eliminates most of the candidates before any benchmarking.

### react-native-svg + Reanimated (already installed)

Works, but it is the wrong shape for static art.

Software Mansion — who maintain `react-native-svg` — published
[You Might Not Need react-native-svg](https://swmansion.com/blog/you-might-not-need-react-native-svg-b5c65646d01f/)
making the case against their own library for this exact case. Their points:

- Every SVG element becomes a React component that goes through reconciliation, unmemoised by
  default, "despite elements never being individually drawn".
- Every element creates a corresponding native view layer.
- There is no caching; a redraw redraws everything.
- Memory leaks on iOS from deeply nested trees.

Their recommendation for static SVGs is `expo-image`, and for animated vector work, Lottie/Rive or
Skia.

The numbers people report are bad at scale. A
[GeekyAnts benchmark](https://geekyants.com/blog/optimizing-svg-rendering-in-react-native-from-react-native-svg-to-expo-image)
puts 500 concurrent `react-native-svg` renders at "9–10 seconds", dropping to ~2.5 s when the same
art is pre-rasterised and served through `expo-image`. There is a
[filed issue](https://github.com/software-mansion/react-native-svg/issues/2660) about flickering and
incomplete rendering at ~100 SVG elements with images.

For this screen the count matters more than it first looks. 30 stickers is not 30 nodes — a flat
character illustration is typically 15–40 paths, so 30 stickers is **450–1,200 native nodes** on
mount. That is survivable but it is a slow first paint on a screen the user sees before anything
else, and it buys nothing, because none of those paths ever change.

`react-native-svg` earns its place when you need "control over parts of your SVG" — state-driven
fills, path morphing, per-element gestures. None of that applies here.

**Verdict: no.** Keep it for icons and QR codes, where it already lives.

### @shopify/react-native-skia

The strongest technical option, and the named upgrade path.

- **SDK 57 pins `@shopify/react-native-skia@2.6.2`** (from Expo's bundled-native-modules manifest
  for SDK 57). Install with `bunx expo install @shopify/react-native-skia`.
- **New Architecture: fully supported.** Skia v2 moved from the paper reconciler to the Fabric
  reconciler with an immutable display list, which
  [Shopify report](https://shopify.engineering/webgpu-skia-web-graphics) as up to **50% faster
  animation time on iOS and ~200% faster on Android**.
- **Expo Go: supported.** The [Expo SDK 57 doc](https://docs.expo.dev/versions/v57.0.0/sdk/skia/)
  lists it as "Included in Expo Go", Android/iOS/tvOS/Web, no config plugin. This project already
  runs a dev client, so it makes no difference either way.
- **Bundle cost:** Skia's own
  [bundle-size page](https://shopify.github.io/react-native-skia/docs/getting-started/bundle-size/)
  states "about **6 MB** of increased download size" on iOS and "around **4 MB** on Android when
  distributed", both including a 220 KB JS bundle increase.

The reason it is the right _technical_ answer is `<Atlas>`. Skia ships a component built for drawing
"a very large number of similar objects" — sprite animations and tile maps — from a single texture:

```jsx
<Atlas image={texture} sprites={spriteArray} transforms={transformArray} />
```

`sprites` are `SkRect`s naming regions of one packed image; `transforms` are `RSXform`s
(rotate/scale/translate) per instance. `useRSXformBuffer` writes those transforms from a worklet, and
the docs state Atlas transforms "can be animated with near-zero cost with worklets". Their example
draws 150 sprites. A 30-sticker drift is a rounding error against that.

The whole field becomes **one `<Canvas>`, one GPU texture, one draw call**, with all motion on the UI
thread. It also unlocks the things that would push you here anyway: blur on the back layer, a
gradient wash, per-sprite tinting, shader effects.

**Verdict: the upgrade path, not the starting point.** 6 MB and a new native dependency is real cost
for a screen that a hundred lines of Reanimated already handles. Move here when the design needs
depth or the sprite count grows.

### Lottie (`lottie-react-native`)

- SDK 57 pins **`lottie-react-native@~7.3.8`** (npm latest is 7.5.0, Apache-2.0).
- Prefer **dotLottie** (`.lottie`) over raw JSON. It was added in 6.1.0 and loads natively rather
  than being parsed in JS and pushed over the bridge — "both lighter and much quicker".
- Real handoff limits: unsupported After Effects features include expressions, merge shapes, 3D
  layers, polystar shapes, alpha-inverted masks and some gradients, so the designer has to build
  inside a known-safe subset. Colour theming at runtime is unreliable in RN; the practical answer is
  exporting colour variants.

The deeper problem is fit. Lottie plays a **timeline**. A sticker field is not a timeline — it is N
loops at different phases, speeds and amplitudes, sized to a device the designer has never seen. If
you bake all 30 drifting sprites into one composition you have hardcoded the layout, cannot respond
to safe-area insets or a small screen, and cannot re-phase anything. If you export 30 separate
Lotties you now have 30 native animation views to get the cost of a JSON parser per sprite for motion
you could have written in four lines.

**Verdict: no for the field.** Lottie is the right tool for a one-shot moment — a mascot waving after
sign-up, a success flourish — not for ambient background drift.

### Rive (`rive-react-native` / `@rive-app/react-native`)

Genuinely excellent, and the one option worth revisiting later.

- Two packages: legacy `rive-react-native@9.8.5` (MIT, ~417 KB unpacked) and the new Nitro-based
  `@rive-app/react-native@0.4.20` (MIT, ~1.5 MB unpacked, peer-depends on
  `react-native-nitro-modules >=0.35.10 <0.36`). Rive
  [recommend migrating to the new runtime](https://rive.app/docs/runtimes/react-native/react-native).
- **Expo:** no first-party config plugin. The
  [Adding Rive to Expo guide](https://rive.app/docs/runtimes/react-native/adding-rive-to-expo) says
  Expo Go is not supported, a **development build is required**, and you set the iOS deployment
  target via `expo-build-properties`. New runtime needs **iOS 15.1+**, legacy 14.0+. This project
  already prebuilds with `expo-dev-client`, so none of that is a barrier.
- **Licence and cost is the catch.** From [rive.app/pricing](https://rive.app/pricing): the **free
  tier cannot export `.riv` files**. Shipping anything requires **Cadet at USD 9/seat/month** (3
  seats max, unlimited files, `.riv` export). Voyager is USD 32/seat/month. Commercial shipping is
  explicitly permitted on paid plans.
- The precedent is strong: **Duolingo animate their characters in Rive**, chosen because they needed
  "unlimited mouth shape combinations while keeping file sizes small for Android, iOS, and Web"
  across 40+ languages ([Duolingo design system](https://design.duolingo.com/illustration/characters),
  [How Duolingo Animates Its World Characters](https://blog.duolingo.com/world-character-visemes/)).

**Verdict: not for v1, keep on the list.** Rive's value is state machines — a character that reacts,
blinks, responds to a tap, changes with app state. Ambient drift uses none of that. Revisit when a
crumpet character needs to _do_ something.

### three.js / expo-gl / react-three-fiber

Plainly the wrong tool. `expo-gl` is alive and not deprecated in SDK 57 (pinned `~57.0.2`,
[docs](https://docs.expo.dev/versions/v57.0.0/sdk/gl-view/)), but:

- You would be spinning up a WebGL context and a 3D scene graph to move 2D quads in a plane.
- The Expo docs explicitly warn that **Three.js and Pixi.js do not work inside Reanimated worklets**,
  so your render loop goes back to the JS thread — the opposite of what you want on the app's first
  screen.
- It does not work with remote debugging enabled.
- Everything three.js would give you here, Skia gives you with less code, native integration, and
  worklet-driven transforms.

**Verdict: no.**

### Pre-rendered PNG/WebP + Reanimated transforms — the cheap 80%

The recommendation.

Each sticker is one WebP at @3x on a transparent background, rendered by `expo-image` (already a
dependency), wrapped in an `Animated.View` whose style is a `useAnimatedStyle` returning
`translateX/translateY/rotate/scale`. Drive it with `withRepeat(withTiming(..., { duration }), -1,
true)` per sprite, with a different duration and phase per sprite so nothing pulses in unison.

Why it wins:

- **Zero new dependencies.** Nothing to install, no prebuild, no bundle growth, no iOS deployment
  target change, no new licence.
- **Transform-only.** `translate`, `rotate`, `scale` and `opacity` are the cheap properties — no
  layout pass, no re-rasterisation, composited by the platform.
- **Fully on the UI thread.** Reanimated worklets "run on the UI thread"
  ([glossary](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/)), so a
  busy JS thread during auth bootstrap does not stall the drift.
- **30 `Animated.View`s is nothing.** Compare with a `FlatList` of 30 animated rows, which nobody
  worries about.
- **The art stays honest.** Vector source is still the master; you export raster for the runtime.
  Nothing is lost, and the Skia migration later reuses the same exports.
- Art weight is the only cost: 30 WebPs at 512×512 with transparency land around 15–40 KB each, so
  **0.5–1.2 MB total**. That is less than a fifth of what Skia would add on its own.

Its ceiling: no blur, no shader tint, no per-sprite masking, and each sprite is its own view so the
sensible upper bound is around 40. Past that, or when you want depth, go to `<Atlas>`.

### Recommendation

|                                        | Choice                                                                                                                      |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Build this**                         | `expo-image` WebP sprites + one `Animated.View` per sticker, Reanimated transform loops                                     |
| **Upgrade to**                         | `@shopify/react-native-skia` `<Atlas>` + `useRSXformBuffer` if you need >40 sprites, parallax depth, blur or shader tinting |
| **Later, if characters need to react** | Rive (`@rive-app/react-native`, dev build, USD 9/mo to export)                                                              |
| **Reserve for one-shot moments**       | Lottie / dotLottie                                                                                                          |
| **Never here**                         | `react-native-svg` for the field; three.js / expo-gl                                                                        |

Because all four live options consume the same vector source, this decision does **not** need to be
made before commissioning the art. Commission the art; pick the runtime afterwards.

---

## 2. Performance

### What actually costs

**SVG nodes.** One native shadow node per path, one reconciliation pass per element, no memoisation
and no caching. Cost scales with total path count, not sticker count. A 30-sticker field of
40-path characters is 1,200 nodes — a mount-time cost paid on the app's first screen. This is the
main reason to avoid SVG here.

**Skia draw calls.** One `<Canvas>` is one surface. `<Atlas>` collapses N sprites into a single
batched draw from a single texture, so cost scales with texture size and overdraw, not with N. The
practical limit is memory for the atlas texture, not sprite count.

**Views + transforms.** A composited transform on an already-rasterised layer is close to free on
iOS. The cost of the raster approach is memory: 30 decoded 512×512 RGBA bitmaps is ~30 MB resident,
which `expo-image` manages and which is fine for one screen but is a reason to size the exports to
what actually renders rather than shipping 1024px art for a 120pt sticker.

### Reanimated 4 and the New Architecture

- Reanimated 4.5.1 with `react-native-worklets` 0.10.1 is installed and current for SDK 57.
- Worklets run on the UI thread; shared values are synchronised between the JS and UI threads. The
  docs stop short of claiming _no_ JS involvement, so read the guarantee as: the per-frame animation
  step is off the JS thread, the setup is not.
- **`useAnimatedProps` on `react-native-svg` works and runs in a worklet.** Reanimated's
  [Animating SVG guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/animating-svg/)
  states it "can animate react-native-svg components — both their geometry (cx, r, d, points, …) and
  their appearance (fill, stroke, opacity, …)", with three routes: inline shared values,
  `useAnimatedProps`, and experimental CSS animations (on by default since 4.4). One documented trap:
  **a shared value bypasses CSS transitions entirely** — "each `r.value` change updates the `r` prop
  directly — so the CSS transition never runs". None of this is needed for this screen, where the
  animation is on the wrapper, not the vector.
- Skia takes Reanimated shared and derived values **directly as props**, with no
  `createAnimatedComponent` wrapper, and runs them on the UI thread
  ([Skia animations doc](https://shopify.github.io/react-native-skia/docs/animations/animations/)).

### Known jank thresholds people report

Treat these as directional, not benchmarks — none name a device.

- 500 concurrent `react-native-svg` renders: **9–10 s**; the same via `expo-image`: **~2.5 s**
  (GeekyAnts).
- ~100 SVG elements with embedded images: flickering, partial rendering
  ([issue #2660](https://github.com/software-mansion/react-native-svg/issues/2660)).
- SVG-backed charts "stutter above a few hundred points" where Skia holds 60fps at 5,000+.
- Skia `<Atlas>` documentation example: 150 sprites, "near-zero cost" worklet transforms.

Our target of 20–40 sprites sits comfortably below every one of these thresholds for the raster
approach, and comfortably below the SVG thresholds too — the argument against SVG is mount cost and
pointlessness, not that it would break.

### What to measure

Measure on a real device, not the simulator, and preferably an older one.

1. **UI-thread FPS and JS-thread FPS while the screen is idle.** The drift must hold ~60fps on the UI
   thread with the JS thread free. If JS FPS drops during the loop, an animation escaped the worklet.
2. **Time to first paint of the auth screen** — cold start to headline visible. This is the number
   the SVG approach damages.
3. **Resident memory delta** on entering the screen. Watch decoded bitmap memory; if it is heavy,
   halve the export dimensions before changing approach.
4. **Dropped frames during the sign-in transition,** not just at rest. A field of 30 animating views
   plus a screen push is the actual worst case.
5. **iOS Instruments (Core Animation / Time Profiler)** via Argent's `native-profiler-*` tools for
   native cost, and `react-profiler-*` for any re-render leak (an `Animated.View` field must not
   re-render on state change — the transforms should live entirely in shared values).
6. **App download size before and after**, if Skia is ever adopted. Compare App Store Connect's
   reported download size, not the `.ipa`.

---

## 3. How Family actually did it

### Stated

- **Family is a native iOS app** by Los Feliz Engineering, now under Avara
  ([launch post](https://family.co/blog/launch)). It is not React Native, so nothing about its
  implementation transfers directly.
- **The people.** The founder is **Benji Taylor** (benji.org), not "Benjamin Spindler" — worth
  correcting. Credits on the Family Wrapped project name **Benji Taylor (Founder)**, **Alex
  Vanderzon (Creative Direction)** and **Joseph Smith (Technical Direction)**
  ([Behance](https://www.behance.net/gallery/181342201/Family-Wallet-Wrapped)).
- **Taylor's design essay, [Family Values](https://benji.org/family-values)**, sets out simplicity,
  fluidity and delight, and describes the app as a physical space where "any element can theoretically
  transform into another". On onboarding specifically: "As you move past the splash screen, you're
  guided through multiple layers with an animation that moves a stack of cards to map out the
  journey." **It contains no implementation detail at all** — no SwiftUI, no Lottie, no Rive.
- **Family Wrapped — a different surface — used Lottie.** Algo Studio (founder/CD Luca Gonnelli,
  design Camille Pagotto, animation Matteo Ruffinengo) built the personalised monthly recap video
  system, and the project lists **Adobe Illustrator, After Effects, Figma and Lottie**. This is the
  only confirmed toolchain fact in the whole search, and it is about the Wrapped videos, not the
  sign-in screen.
- **[60fps.design/apps/family](https://60fps.design/apps/family)** catalogues 65+ Family
  interactions, credited to Benji Taylor, including "Wallet Creation Onboarding Sheets Morph
  Interaction", splash screen animations, a "Mascot Animation" and a "Pocket Card Subtle Character
  Animation". It documents _what_ the motion looks like. It publishes no code, framework or
  methodology.

### Inferred

- Nobody has published how the sign-in sticker field is built. Every account of Family's design is
  about motion philosophy, not implementation.
- Given it is native iOS and the motion is simple rigid-body drift, the overwhelmingly likely
  implementation is **UIKit/SwiftUI views over static vector assets with per-view transform
  animations** — the direct analogue of the recommendation in section 1. There is no signal that a
  vector runtime is involved in the sticker field, and the Lottie evidence points at a separate
  product surface.
- The illustrator behind Family's character set is not publicly credited anywhere findable. The
  in-house creative direction credit is Alex Vanderzon.

### Comparable sticker-field screens

- **Duolingo.** The best-documented character system in the industry, and it is all public.
  [design.duolingo.com/illustration](https://design.duolingo.com/illustration) explains that every
  illustration is built from **three primitives — rounded rectangle, circle, rounded triangle** —
  with heads and bodies "typically composed of 1–2 basic shapes each". The character set took **a
  year and a half** to land ([Building character](https://blog.duolingo.com/building-character/)).
  Animation runs on **Rive**, chosen for combinatorial mouth shapes at small file size across iOS,
  Android and web ([world character visemes](https://blog.duolingo.com/world-character-visemes/)).
  This is the single best reference for _how to specify_ the crumpet set: a construction grammar
  beats a pile of drawings.
- **Headspace.** The register the brief is aiming at. The 2023–24 refresh was in-house creative
  direction with **Italic Studio** on design support, **Colophon Type Foundry** on the custom
  typeface, and guidelines by **Order**
  ([It's Nice That](https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424)).
  Named illustrators include **Ryan Cox**, **Sasha Baranovskaya** and
  **[Karen Yoojin Hong](https://www.karenyoojin.com/headspace-illustrations)**. The stated rules:
  playful faces, bold colour, no sharp edges, ambiguous characters in many shapes and sizes
  ([Blush interview with Karen Hong](https://blush.design/blog/post/headspace-mindfulness-app)).
- **Arc.** No published write-up on their illustration pipeline was findable.

The transferable lesson from all three: the thing that makes these sets work is **a construction
system, not a set of drawings**. Ask the illustrator for the grammar, not just the output.

---

## 4. Getting real art

This is the half that decides whether the screen works.

### Where to hire

**Portfolio-first, direct commission** — the right approach for a set this specific.

| Venue                                                                          | What it is                                                                                                                            | Use it for                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Dribbble — illustrators for hire](https://dribbble.com/illustrators-for-hire) | Filterable, availability-flagged, has a services marketplace with fixed-price packages                                                | The default. Best signal-to-noise for this exact register.    |
| [Behance job list](https://www.behance.net/joblist)                            | Adobe's portfolio network; deeper folios than Dribbble shots                                                                          | Verifying that a Dribbble shot is backed by real project work |
| [Working Not Working](https://www.workingnotworking.com)                       | Vetted senior creatives; [acquired by Fiverr in 2021](https://www.fiverr.com/news/working-not-working-acquisition) but run standalone | Higher end, if the budget stretches                           |
| [Folyo](https://folyo.me)                                                      | Curated shortlist service — you post, they hand you a vetted list                                                                     | Saving your own sourcing time                                 |
| Twitter/X and Instagram                                                        | Where this register of illustrator actually posts                                                                                     | Cold outreach; reply to work you like                         |

**Agencies and representation** — you pay a margin, you get producing, contracts, licensing done
properly, and a much lower chance of the project falling over.

- **[The Jacky Winter Group](https://www.jackywinter.com)** — Melbourne, New York, London, founded
  2007, 100+ artists. The obvious first call for an Australian project: AUD quotes, Australian
  contract law, an agent-producer who prices the licence for you.
- **[Folio Art](https://www.folioart.co.uk)** (London), **[Jelly](https://www.jellylondon.com)**
  (London/NY/LA) — large illustration rosters, strong in the flat-vector commercial register.

**Named illustrators and studios in the Family/Headspace register.** All URLs verified live
2026-09-03. Availability and fit still need checking directly.

| Who                 | Portfolio                                                                | Why                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Timo Kuilder        | [dribbble.com/zwartekoffie](https://dribbble.com/zwartekoffie)           | Flat vector, warm palette, clients include Firefox, NYT, Google, Slack, Expo. Closest single match to the target register. |
| Ordinary Folk       | [ordinaryfolk.co](https://www.ordinaryfolk.co)                           | LA/Auckland design-and-animation studio. Character work with exactly this softness. Studio pricing.                        |
| Studio Muti         | [studiomuti.co.za](https://studiomuti.co.za)                             | Cape Town. Bold flat vector with strong character construction.                                                            |
| Guillaume Kurkdjian | [guillaumekurkdjian.com](https://www.guillaumekurkdjian.com)             | Flat vector, playful objects-with-personality — very close to "crumpet as a character".                                    |
| Justin Mezzell      | [justinmezzell.com](https://justinmezzell.com)                           | US, flat vector character and product illustration.                                                                        |
| Alice Lee           | [byalicelee.com](https://byalicelee.com)                                 | Slack and Dropbox illustration systems. Systems thinking, not just drawings.                                               |
| Tom Froese          | [tomfroese.com](https://www.tomfroese.com)                               | Warm, textured flat vector. Also teaches, so briefs land well.                                                             |
| Karen Yoojin Hong   | [karenyoojin.com](https://www.karenyoojin.com/headspace-illustrations)   | Literally the Headspace register.                                                                                          |
| Nathan Doverspike   | [nathandoverspike.com](https://nathandoverspike.com/character-designs-1) | Duolingo character design credits.                                                                                         |

### Price bands (AUD, 2026)

Everything below assumes **full commercial buyout**, which is the term you want and roughly doubles a
limited-licence quote.

| Scope                                                                                                     | Freelancer (mid, Dribbble-sourced) | Established name / agency roster |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------- |
| One character, style already locked                                                                       | **$300 – $700**                    | **$800 – $2,000**                |
| **Small set: 5–8 characters** incl. style exploration and light usage notes                               | **$2,500 – $6,000**                | **$7,000 – $15,000**             |
| **Medium set: 15–25 characters** incl. a proper style guide                                               | **$8,000 – $20,000**               | **$20,000 – $45,000**            |
| Style guide as a separate deliverable (construction grid, palette mapping, do/don't, Figma component kit) | **$2,000 – $5,000**                | **$5,000 – $12,000**             |
| Day rate                                                                                                  | **$600 – $1,200/day**              | **$1,500 – $2,500/day**          |

**Where these come from.** They are built up from published anchors rather than invented:

- **[NAVA Code of Practice](https://code.visualarts.net.au/payment-rates/fees/freelance-fees)**
  (Australian, effective 1 July 2026, the closest thing to an official AU floor): illustration
  **colour cover $1,448**, **spot cartoon $239**; freelance photography/writing day rate
  **$1,197.82/day**, **$300.02/hour**.
- **[Jacky Winter pricing](https://www.jackywinter.com/pricing)**: a single digital spot illustration
  for national news, one revision round, ~48-hour turnaround, licensed to one article and going
  non-exclusive after 3 months — **AUD 500**. They state there is no minimum fee and they work "from
  $2K to $400K". A 4-illustration editorial suite for a fashion magazine with 2 revision rounds over
  3 weeks: **GBP 2,500** (~AUD 4,900).
- **[Illustrators Australia](https://www.illustratorsaustralia.com/rates-of-pay/)**: their published
  figures are book-illustration base rates ("a guide only… a base rate for you to build your own price
  from"), with **+20% for a one-off flat fee** and **+20% again if copyright is assigned**. They also
  note plainly that many Australian illustrators charge under the published rates because of overseas
  competition.
- **[Creative Boom's freelance illustration rates guide](https://www.creativeboom.com/tips/freelance-illustration-rates/)**:
  working illustrators quote **$700–$1,600 per illustration** as an average; a 30-illustration set
  with heavy revisions reached **$9,000**. On buyout their advice is blunt — **"if someone wants the
  copyright, add a zero."** Also: charge for usage not time, and add a rush fee.
- **[No Boring Design's 2025 illustration cost guide](https://www.noboringdesign.com/blog/illustration-costs)**:
  entry-level $15–50/hr, mid $50–100/hr, expert $100+/hr; simple projects $150–500, complex
  $1,000–5,000+. Rights-managed licensing costs **20–50% more** than royalty-free.
- The **Graphic Artists Guild Handbook** figure quoted across sources: **USD 100–400/hour** for
  freelance illustration (~AUD 150–600/hour).
- Australian context on hourly rates:
  [theillustrators.com.au](https://www.theillustrators.com.au/illustrator-pricing-australia) puts the
  national average at **~AUD 50/hour**, rising to **$150–250/hour** for corporate on-site work in
  Sydney and Melbourne, and notes a **50% deposit** is standard.

Conversions above use roughly USD 1 = AUD 1.52 and GBP 1 = AUD 1.95. Check the rate before quoting.

**A realistic plan for Crumpet:** budget **AUD 4,000–8,000** for a first set of 8–12 crumpet-pet
characters plus a style guide from a good mid-level freelancer, sourced on Dribbble, with full
buyout. That gets a distinctive screen. Expanding to 25 characters later is cheap once the grammar
exists — the style exploration is most of the first invoice.

### Turnaround

- **Style exploration** (2–3 directions, one character each, before anything is locked): **1–2 weeks**.
  Do not skip this and do not compress it. It is where the whole thing is decided.
- **Production once the style is locked**: **1–3 characters per day** for a flat vector set built on
  a shared construction grid.
- **A set of 8–12 with a style guide**: **3–5 weeks elapsed**, allowing for feedback rounds.
- **A set of 20–25**: **6–10 weeks elapsed**.
- **A single spot illustration for an existing client**: ~48 hours (Jacky Winter's stated turnaround).
- Add a **25–100% rush surcharge** if you compress any of this. That is the industry norm, and it is
  the wrong place to spend money.

Freelancers book out. Budget 2–6 weeks of lead time before a good one can start.

### What the brief must contain

Write it as a document, not a DM. The gap between a good and a bad illustration commission is almost
entirely the brief.

1. **The product in two sentences.** Crumpet is a pet-care coordination app. A household shares
   responsibility for a pet, members log feeds, everyone gets notified, and the app flags missed
   feeds.
2. **The one screen this is for.** A full-bleed field of stickers behind a headline and two buttons,
   on the sign-in screen — the first thing a user ever sees. Include a wireframe with the real safe
   areas.
3. **The concept, precisely.** A crumpet with a pet popping out of it. Say what "crumpet" means
   visually (the holes are the character — they are the thing that makes the mark ownable) and what
   "popping out" means (head and paws only? whole animal? emerging or perched?).
4. **The character list.** Name every one. Dog, cat, rabbit, guinea pig, bird, fish, lizard, horse,
   ferret, hamster… and specify breeds where they matter, because a golden retriever and a dachshund
   read differently at 80pt.
5. **The register, with references.** Family, Headspace, Duolingo — with links, and a sentence each
   on what you want from them. Say what you do _not_ want just as clearly (no gradients-as-texture,
   no 3D, no outlines, no faces on the crumpet itself — whatever the actual constraints are).
6. **The palette, as hex.** Give them the real tokens from `src/constants/theme.ts`: background
   `#FBFAF8`, primary `#F0A81C`, and the dark-mode equivalents (`#111011`, `#F5B435`). State that the
   art must read on **both** a warm off-white and a near-black background, since the app is
   light-first but themed. This is the constraint most likely to be missed.
7. **Size and reading distance.** Each sticker renders at roughly **80–140pt** on device. Detail
   below about 3pt will vanish. Ask them to check at final size, not zoomed in.
8. **Construction rules you want back.** Ask explicitly for the Duolingo treatment: a small set of
   primitive shapes, a stated stroke and corner-radius vocabulary, and a rule for how a new animal is
   added. This is what lets you (or a cheaper illustrator) extend the set in a year.
9. **Deliverables, named.** See below. Be specific about file format or you will get a flattened PNG
   and a headache.
10. **Licence.** See below. State it in the brief, not in the contract at the end.
11. **Budget, timeline, revision count.** Say the number. Two revision rounds is standard; name it.
12. **Who approves, and how.** One decision-maker. Feedback in writing, batched, once per round.

### What to ask for as the deliverable

Given the section 1 recommendation, the ask is **vector source plus raster exports**, not a runtime
file:

1. **Editable master: a Figma file.** One component per character, all on a shared construction grid,
   with the palette as Figma variables mapped to the app's token names. Figma over `.ai` because you
   can open it, inspect it, and hand it to the next illustrator.
2. **Per-character SVG.** Flattened strokes (outlined, not live strokes), one artboard each, a
   **uniform square canvas** for every character, transparent background, no clipping masks, no
   embedded rasters, optimised. The uniform canvas is what makes them composable in code.
3. **Per-character PNG @1x/@2x/@3x** on transparent, sized to the real render size (so ~140/280/420 px
   for a 140pt sticker), and **WebP at the same sizes** — this is what actually ships.
4. **A packed sprite sheet plus a JSON frame map**, one 2048×2048 or 4096×4096 atlas. Ask for this
   even though v1 will not use it: it is the artefact that makes the Skia `<Atlas>` migration a
   half-day instead of a re-commission, and it costs the illustrator ten minutes.
5. **Style guide as PDF** — construction grammar, palette, stroke/radius rules, spacing, worked
   examples of a right and a wrong new character, and a do/don't page.
6. **Source of everything** — the working file, not just exports.

**Do not ask for Lottie or Rive for this screen.** A `.riv` locks the motion into a tool you would
then have to pay for and licence; the drift belongs in code where it can respond to screen size. If
you later commission a reacting mascot, that is a separate brief and a `.riv` is the right answer
then.

### Licence terms to insist on

For a brand asset that will appear on the first screen of a commercial app, ask for:

- **Full assignment of copyright**, or failing that, an **exclusive, perpetual, worldwide, irrevocable
  licence across all media**, including derivative works and the right to sublicense to Apple and
  Google as required by app store distribution.
- **Exclusivity.** The single most important term. Not for the style — you cannot own a style, and it
  is unreasonable to ask — but the **specific characters must not be relicensed, sold as a pack, or
  uploaded to a stock marketplace**. Get this in writing. It is what stops another pet app shipping
  your crumpets.
- **Moral rights consent.** Australia-specific and often missed: under the Copyright Act, moral rights
  cannot be assigned, only consented to. Include a written consent to acts or omissions that would
  otherwise infringe them, so you can crop, recolour, animate and composite the art without a further
  conversation.
- **Portfolio use permitted.** Give this freely. It costs nothing, it is what illustrators care most
  about, and refusing it will cost you more than it saves.
- **Source files included in the fee.** State it. Some quotes exclude them.
- **Warranty of originality**, and confirmation the work is not AI-generated and does not incorporate
  third-party assets.
- **Kill fee and revision cap** stated up front, protecting both sides.

**Expect this to raise the price**, and pay it. Illustrators Australia specify **+20% where copyright
is assigned**; Creative Boom's advice on a full copyright transfer is "add a zero"; No Boring Design
puts rights-managed at 20–50% above royalty-free. The honest middle for a small set with genuine
exclusivity is roughly **1.5–2× a limited-licence quote**. A limited licence on your sign-in art is
false economy — you will need the characters everywhere within a year.

### The honest alternative: paid packs

Worth stating so it can be ruled out on the facts.

| Source                                                                                     | Cost                                                        | Licence                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Blush](https://blush.design)                                                              | Free tier; Pro ~USD 12/mo or 96/yr                          | [Non-exclusive](https://blush.design/license), commercial use allowed, **no attribution required**. Prohibits reselling, merchandise, and building a competing library. |
| [Streamline](https://home.streamlinehq.com/pricing)                                        | ~USD 348/yr, or one-time purchase                           | Unlimited commercial projects, **capped at 50 illustrations per project**. Assets already downloaded remain usable after the subscription lapses.                       |
| [Icons8 Ouch](https://icons8.com/illustrations/pricing)                                    | From ~USD 0.50/illustration; ~USD 24/mo removes attribution | Free use requires **two backlinks to Icons8** on the site or social. Paid plans remove attribution and unlock formats.                                                  |
| [Humaaans](https://www.humaaans.com) / [Open Peeps](https://openpeeps.com) (Pablo Stanley) | Free                                                        | CC0-style, mix-and-match, commercial use fine. Human figures only.                                                                                                      |
| [Storyset](https://storyset.com), [unDraw](https://undraw.co)                              | Free                                                        | Commercial use fine; Storyset attribution varies by plan.                                                                                                               |

**Three reasons this does not solve the problem here.**

1. **Nothing in any of them is a crumpet with a pet in it.** The concept is the brand. Adapting a
   stock character into a crumpet-pet is bespoke illustration with an awkward starting point and no
   clean licence trail on the derivative.
2. **None of them are exclusive.** Blush states plainly that its licence is nonexclusive. Every one of
   these packs is on thousands of sites, and Humaaans in particular is so recognisable that using it
   reads as "we had no budget". A competitor can and will use the same set.
3. **They defeat the stated aim.** The brief is a distinctive brand look. A pack is by definition the
   opposite.

Where they _are_ genuinely useful: as **prototype filler**. Build the whole drifting field with Blush
or Open Peeps assets, prove the motion, tune the density and the sizes, screenshot it — and use that
screenshot as a page in the illustrator's brief. That is a strong use of a free pack, and it makes
the commission much more likely to land first time.

---

## 5. Verdict: hire

**Hire an illustrator.** Not marginally — clearly.

The reasoning:

- **The art is the differentiator, and the code is not.** The motion is a hundred lines of Reanimated
  that anyone could write. The characters are the thing nobody else has. Spending the effort on the
  half that is commodity and skimping on the half that is not gets it exactly backwards.
- **It is the first screen.** Every user sees it before they see anything else, and it is the screen
  in every App Store shot and every share. There is no surface in the app where quality compounds
  more.
- **The register is deceptively hard.** Flat vector character work in the Family/Headspace mode looks
  simple and is not. It is a construction system — Duolingo spent **eighteen months** landing theirs,
  and reduced it to three primitive shapes only after that. The reason a well-made set reads as
  charming and a self-made one reads as clip art is a hundred small decisions about weight, radius,
  proportion and negative space that are invisible until they are wrong.
- **The cost is small against what it buys.** AUD 4,000–8,000 is a fraction of a month of contract
  development, and unlike code, the art does not need maintaining. It goes on the App Store page, the
  onboarding, the empty states, the push notification icons, the marketing site and eventually the
  merch.
- **AI output is the wrong tool here, and it will show.** Not on the grounds of any single image, but
  because a set needs internal consistency — the same construction, the same weight, the same
  personality across twenty animals — and that consistency is precisely what generation does not
  give you. It also gives you no source file, no style guide, and no clean answer about rights.

**What to do yourself:** the brief, the wireframe, the palette constraints, the character list, the
prototype with free pack assets to prove density and motion, and all of the code. That is real work
and it is work you are better at than the illustrator.

**What to buy:** the characters, the construction grammar, and the exclusive licence.

If the budget genuinely is not there yet, the correct move is **not** a stock pack and **not**
generated art. It is to ship the sign-in screen without the field — a clean warm surface, good type,
the two buttons — and add the stickers as a deliberate moment when the art exists. A plain screen
that is confidently plain beats a busy screen made of somebody else's characters.

---

## Sources

- [Expo SDK 57 changelog](https://expo.dev/changelog/sdk-57)
- [Expo docs — @shopify/react-native-skia (SDK 57)](https://docs.expo.dev/versions/v57.0.0/sdk/skia/)
- [Expo docs — GLView (SDK 57)](https://docs.expo.dev/versions/v57.0.0/sdk/gl-view/)
- [React Native Skia — Atlas](https://shopify.github.io/react-native-skia/docs/shapes/atlas/)
- [React Native Skia — Animations](https://shopify.github.io/react-native-skia/docs/animations/animations/)
- [React Native Skia — Bundle size](https://shopify.github.io/react-native-skia/docs/getting-started/bundle-size/)
- [Shopify Engineering — The Future of React Native Graphics](https://shopify.engineering/webgpu-skia-web-graphics)
- [Reanimated — Animating SVG](https://docs.swmansion.com/react-native-reanimated/docs/guides/animating-svg/)
- [Reanimated — Glossary](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/glossary/)
- [Software Mansion — You Might Not Need react-native-svg](https://swmansion.com/blog/you-might-not-need-react-native-svg-b5c65646d01f/)
- [GeekyAnts — Optimizing SVG Rendering in React Native](https://geekyants.com/blog/optimizing-svg-rendering-in-react-native-from-react-native-svg-to-expo-image)
- [react-native-svg issue #2660](https://github.com/software-mansion/react-native-svg/issues/2660)
- [Rive — React Native runtime](https://rive.app/docs/runtimes/react-native/react-native)
- [Rive — Adding Rive to Expo](https://rive.app/docs/runtimes/react-native/adding-rive-to-expo)
- [Rive — Pricing](https://rive.app/pricing)
- [lottie-react-native](https://github.com/lottie-react-native/lottie-react-native)
- [Family — launch post](https://family.co/blog/launch)
- [Benji Taylor — Family Values](https://benji.org/family-values)
- [Algo Studio — Family Wallet Wrapped (Behance)](https://www.behance.net/gallery/181342201/Family-Wallet-Wrapped)
- [60fps.design — Family](https://60fps.design/apps/family)
- [Duolingo Design — Illustration](https://design.duolingo.com/illustration)
- [Duolingo — Building character](https://blog.duolingo.com/building-character/)
- [Duolingo — How Duolingo Animates Its World Characters](https://blog.duolingo.com/world-character-visemes/)
- [It's Nice That — Headspace visual identity](https://www.itsnicethat.com/articles/italic-studio-headspace-graphic-design-project-250424)
- [Blush — Headspace illustration interview](https://blush.design/blog/post/headspace-mindfulness-app)
- [NAVA Code of Practice — Freelance fees](https://code.visualarts.net.au/payment-rates/fees/freelance-fees)
- [Jacky Winter — Pricing](https://www.jackywinter.com/pricing) and [FAQ](https://www.jackywinter.com/faq)
- [Illustrators Australia — Rates of pay](https://www.illustratorsaustralia.com/rates-of-pay/)
- [Creative Boom — Freelance illustration rates](https://www.creativeboom.com/tips/freelance-illustration-rates/)
- [No Boring Design — 2025 guide to illustration costs](https://www.noboringdesign.com/blog/illustration-costs)
- [The Illustrators — Illustrator pricing Australia](https://www.theillustrators.com.au/illustrator-pricing-australia)
- [Blush — Licence](https://blush.design/license) and [Plans](https://blush.design/plans)
- [Streamline — Pricing](https://home.streamlinehq.com/pricing)
- [Icons8 — Illustrations pricing](https://icons8.com/illustrations/pricing)
- [Fiverr — Working Not Working acquisition](https://www.fiverr.com/news/working-not-working-acquisition)
