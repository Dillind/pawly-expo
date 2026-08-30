# Crumpet — Product Brief

> **Pet care, coordinated — feeding, records, and the people who help.** Crumpet starts with dog feeding but the model is intentionally pet-general, leaving room for a broader "pet companion + household coordination" vision. Feeding is the daily habit that makes anyone open the app; everything else earns its place around it. The name comes from the dog the app was built for; it is a mascot, not a scope limit.
> Domain terminology is defined in [CONTEXT.md](../CONTEXT.md). Decisions are recorded in [docs/adr/](./adr/).

---

## The Problem

People who share care for a pet with a partner, housemate, dog walker, or pet sitter have no reliable way to know if the pet has been fed. The current solution is a WhatsApp message or shouting across the house — both unreliable, both easy to miss. The result is double feeds, missed feeds, and low-grade anxiety when you're not home. No dedicated tool gives a household real-time visibility into a pet's care without the friction of a group chat.

---

## Target User

A pet owner who shares responsibility with at least one other person — partner, housemate, dog walker, or pet sitter. They're on their phone regularly, care about their pet's routine, and want peace of mind when away. Solo owners with no shared care are not the primary user — the coordination problem doesn't exist without a second person.

**What would make them delete this immediately:** notifications that are too noisy, or a log that feels untrustworthy — if the app makes it look like the pet wasn't fed when it actually was (or vice versa), trust collapses instantly.

---

## MVP Scope

### Core (v1)

- **Pet profile onboarding** — name, breed, birthdate (approximate allowed for rescues), photo. Anchors the whole experience.
- **Feeding schedule setup** — set expected feed times per day (e.g. 7am, 12pm, 5pm), interpreted in the household's timezone. Required for missed-feed alerts.
- **Household + timezone** — a household is the group of people caring for the pet; it has a single timezone (the pet's location) and a configurable missed-feed grace window (default 60 min).
- **Manual feed log** — one-tap log with optional notes ("didn't finish his bowl"). Timestamp recorded automatically but **adjustable/backdatable** (forgot-to-log case).
- **Correcting your own log** — a member can edit/delete their own recent feed log (protects trust from mis-taps).
- **Double-feed warning** — at log time, warn if a recent feed already covers this slot.
- **Members & roles** — Owners (full control, multiple allowed) and Contributors (log feeds; edit/delete only their own recent logs). See CONTEXT.md.
- **Invite flow** — Owner generates a shareable, revocable, expiring invite link/code; invitee signs up and joins as a Contributor. See [ADR 0003](./adr/0003-invite-via-shareable-link.md).
- **Push on feed logged** — "[Person] fed [Pet] at 2:34pm" to all household members instantly.
- **Missed feed alert** — if no satisfying feed is logged within the grace window after a scheduled time, the whole household gets a nudge. Server-side via Edge Function cron. See [ADR 0002](./adr/0002-missed-feed-alert-engine.md).
- **Activity feed / history** — chronological log of all feed events, visible to the whole household.
- **Settings screen** — notification preferences, manage members, manage subscription (ready for v2), app icon changes, log out, delete account, request/vote on features (Canny), app info.
- **Email/password auth** — simple and frictionless. No SSO in v1.
- **Light and dark mode** — the theme already ships both palettes and follows the system setting (`userInterfaceStyle: automatic`).
- **Animated empty states + mascot moments** — delightful and intentional, especially in onboarding and the empty feed log.

### v2 / Nice to Have

- **Multiple pets in the UI** — the data model already supports many pets per household; the UI/paywall is deferred. Paywall candidate.
- **Calendar view** — needs weeks of data to be useful.
- **Water log** — real concern, adds logging friction in v1.
- **Walk logging** — natural extension once feeding is solid.
- **Weight tracking** — valuable for puppies; good paywall candidate (birthdate already stored).
- **Vet appointment reminders** — different interaction model.
- **Medication reminders** — high value for older pets, easy to add later.
- **Apple Sign-In + Google SSO** — Apple Sign-In becomes mandatory the moment any other OAuth provider is added on iOS. Add both together.
- **Extended history and analytics** — paywall candidate.
- **Custom notification schedules / per-schedule grace windows** — paywall candidate.

### Out of Scope

- **Public social — profiles, a follower graph, discovery, strangers, anything visible outside a household** — the 11pm-build-session temptation. It goes here so you don't. Different product. This ban is permanent and is not softened by the private version below.
- **Pet sounds library** — different core loop, v3 at earliest.
- **Events / community features** — same as above.
- **Comments, threads, @mentions on Posts** — deferred, not banned. See ADR 0017.

**Amended 2026-08-09.** This list used to read "social media feed / life updates / walk posts", which banned the private version along with the public one. Private, household-only Posts are now in scope — see ADR 0017 and the Household surface in CONTEXT.md. The reasoning is not that sharing is a nice extra. It is that everyone with a relation to the pet is already in the app, so a sitter can post a photo without being added to a family thread and the owner never has to awkwardly ask for one. What stays banned is any audience wider than the household.
- **Custom backend / NestJS / OpenAPI** — Supabase generated types + Zod schemas on Edge Functions cover typing needs without the overhead.

---

## Success Metrics

**3-month target:** 100 users who log at least one feed per week for 4 consecutive weeks. That's retention, not downloads — 100 people still opening it a month after install means the core loop works.

---

## Monetisation

**Freemium — a genuinely useful free tier, paywall for power features.** Modelled on Hevy: the free tier is worth coming back to, not crippled.

- **Free:** core feeding log, household coordination (small household — cap to finalise; see open question), push notifications, one pet, basic history (30 days), Posts — unlimited posting, last 30 days visible.
- **Paid:** multiple pets, unlimited history (feeding *and* Posts), calendar view, weight tracking, custom notification schedules, priority support, exclusive app icons.

The Posts line follows the rule the rest of the list follows: never cap the core loop, cap breadth and history. A free household still gets the whole away-from-home case, because a trip is a fortnight, not a year.

**None of this is built.** The 30-day Posts limit in particular is deliberately *not* implemented in CRU-011 — every household sees its full history until subscriptions are actually built. Gating history before there is anything to gate adds a code path with no revenue attached to it, and the cut-off is a `where` clause whenever it is wanted.

**No paywall in v1.** Get RevenueCat initialised and ready; don't flip the switch until real users are asking for more.

---

## Risks & Open Questions

- **Technical spike needed (Priority 1):** Supabase Edge Function cron for missed-feed alerts. Build this before anything else — least-certain part of the stack, underpins a core v1 feature. See ADR 0002.
- **Free-tier household cap:** with multiple Owners allowed, the "up to 2 contributors" limit should be re-expressed as a total-member cap. Finalise the number.
- **Scope creep watch:** public social — profiles, followers, discovery. Explicitly out of scope and permanently so. Named here so it's easier to resist. Private household Posts are in scope (ADR 0017); the line between them is the audience, and it does not move.
- **Invite flow friction:** invitees must download the app and create an account before joining. Onboarding must be dead simple or the multi-member model falls apart. See ADR 0003.
- **Notification behaviour on iOS:** missed-feed alerts depend on reliable background processing and APNs delivery. Test on a real device early, not just the simulator.

---

## Design Direction

**Vibe:** design-conscious, inviting, polished. **Reference:** Luna Budgeting App — thoughtful micro-interactions, haptics, gestures, native iOS feel, nothing generic.

**Palette — settled 2026-08-30, and it is golden, not teal.** The app icon is a pale cream crumpet
on a marigold ground, and the palette now answers to it. Full values in
[THEMING.md](./THEMING.md); the reasoning in [ADR 0034](./adr/0034-a-warm-light-first-palette-with-gold-as-a-fill.md).

| | | |
|---|---|---|
| Page | `#FAF6EF` | Warm off-white. **Not** a cool grey — that mismatch is what made gold look cheap. |
| Primary | `#F0A81C` | Gold. A **fill**, never a text colour. |
| On primary | `#2A1D06` | The label on a gold fill. Never white. |
| Primary text | `#9E6404` | A gold *label* on a light surface. `primary` on white is 2.0:1 and fails. |
| Success | `#10696B` | The tick, and every "done" state. |

**Gold has three jobs and no more:** the Home banner wash, the Log chip, and the active tab. Adding
a fourth drains the meaning from the other three. Gold marks what needs doing; teal marks what is
done. There is no colour per pet — a pet is told apart by its photo.

**Light-first.** Dark mode is a port of this palette, not a second design.

Type is **Gabarito** for headings over **Inter** for body. Both are Google Fonts under the Open Font
Licence, so there is nothing to buy. Styling approach is documented in THEMING.md and
[ADR 0004](./adr/0004-custom-theme-no-component-library.md).

The teal/blue/indigo palette that stood here from the start was aspirational and was never built.
It is recorded in ADR 0034 as the alternative that lost, so nobody proposes it again.

---

## Timeline

Side-project pace, no deadline.

**v1 milestone ("done enough to show someone"):** a friend with a dog can create an account, set up their pet profile, configure a feeding schedule, invite one other person, log a feed, and that person receives a push notification. That's the moment the app proves its value.
