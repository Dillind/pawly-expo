# Crumpet — Product Brief

> Crumpet is a pet-care coordination app. It starts with dog feeding but the model is intentionally pet-general, leaving room for a broader "pet companion + household coordination" vision. The name comes from the dog the app was built for; it is a mascot, not a scope limit.
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

- **Social media feed / life updates / walk posts** — the 11pm-build-session temptation. It goes here so you don't. Different product.
- **Pet sounds library** — different core loop, v3 at earliest.
- **Public pet profiles / follower graph** — startup scale, not a side project.
- **Events / community features** — same as above.
- **Custom backend / NestJS / OpenAPI** — Supabase generated types + Zod schemas on Edge Functions cover typing needs without the overhead.

---

## Success Metrics

**3-month target:** 100 users who log at least one feed per week for 4 consecutive weeks. That's retention, not downloads — 100 people still opening it a month after install means the core loop works.

---

## Monetisation

**Freemium — a genuinely useful free tier, paywall for power features.** Modelled on Hevy: the free tier is worth coming back to, not crippled.

- **Free:** core feeding log, household coordination (small household — cap to finalise; see open question), push notifications, one pet, basic history (30 days).
- **Paid:** multiple pets, unlimited history, calendar view, weight tracking, custom notification schedules, priority support, exclusive app icons.

**No paywall in v1.** Get RevenueCat initialised and ready; don't flip the switch until real users are asking for more.

---

## Risks & Open Questions

- **Technical spike needed (Priority 1):** Supabase Edge Function cron for missed-feed alerts. Build this before anything else — least-certain part of the stack, underpins a core v1 feature. See ADR 0002.
- **Free-tier household cap:** with multiple Owners allowed, the "up to 2 contributors" limit should be re-expressed as a total-member cap. Finalise the number.
- **Scope creep watch:** a social media feed. Explicitly out of scope. Named here so it's easier to resist.
- **Invite flow friction:** invitees must download the app and create an account before joining. Onboarding must be dead simple or the multi-member model falls apart. See ADR 0003.
- **Notification behaviour on iOS:** missed-feed alerts depend on reliable background processing and APNs delivery. Test on a real device early, not just the simulator.

---

## Design Direction

**Vibe:** design-conscious, inviting, polished. **Reference:** Luna Budgeting App — thoughtful micro-interactions, haptics, gestures, native iOS feel, nothing generic.

**Palette (proposed):**
- Primary: `#0F7173` Stormy Teal
- Secondary: `#2E5077` Dusk Blue
- Dark background: `#383961` Twilight Indigo
- Accent (CTAs, highlights): `#6E44FF` Majorelle Blue — use sparingly

> Note: the proposed palette above is aspirational. The theme currently in code (`src/constants/theme.ts`) is a neutral black/white/grey system. Reconcile the two in a dedicated design session before building out the visual system. Styling approach is documented in THEMING.md and [ADR 0004](./adr/0004-custom-theme-no-component-library.md).

---

## Timeline

Side-project pace, no deadline.

**v1 milestone ("done enough to show someone"):** a friend with a dog can create an account, set up their pet profile, configure a feeding schedule, invite one other person, log a feed, and that person receives a push notification. That's the moment the app proves its value.
