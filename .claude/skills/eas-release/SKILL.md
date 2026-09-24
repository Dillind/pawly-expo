---
name: eas-release
description: How this repo builds and ships iOS through EAS and TestFlight. Read before running eas build or eas submit, before a TestFlight or App Store release, when choosing a build profile, when a build fails on missing EXPO_PUBLIC_ env vars, or when adding a qa profile.
---

# Releasing Crumpet through EAS

The build scripts always name a profile, deliberately. A bare `eas build` defaults to
**production** by accident. All three EAS environments hold the same five variables and all point
at the production Supabase project. `.env` is gitignored and never reaches the builder, so anything
the app reads from `process.env` has to exist as an EAS environment variable too (`eas env:list`),
or, for the `qa` profile, in its `env` block.

## TestFlight

**`preview` cannot reach TestFlight.** It is `distribution: "internal"` — an ad hoc build for
registered device UDIDs, installed from a link. TestFlight takes **store** builds only, which is
what `production` is. Use `preview` to put a build on a device without waiting for App Store
processing; use `testflight` for anything a real tester should see.

**TestFlight is not a build type, it is the doorway.** Every store build lands there first, and an
App Store release promotes a build already in TestFlight. Same binary, so never rebuild "for
release" — submit the build that was tested.

`--auto-submit` runs the submit profile **whose name matches the build profile**, so
`--profile production` uses `submit.production`.

**`submit.production` is empty on purpose.** EAS owns the Apple credentials: on the first submit it
signs in to Apple and keeps an App Store Connect API Key on its servers (`eas credentials -p ios` to
inspect or reset). Every submit after that is non-interactive with no config at all. The
`appleId` / `ascAppId` / `appleTeamId` and `ascApiKey*` fields exist for CI runners and for juggling
several Apple accounts — putting them here otherwise duplicates what EAS already knows, and hardcodes
an id that only fails once the build has finished.

To skip the sign-in prompt without committing anything, export `EXPO_APPLE_ID` and
`EXPO_APPLE_TEAM_ID`. The CLI prints the team id on the first run.

**The App Store Connect app record must exist before the first submit.** EAS does not create it.
Without one the submit fails with _"No suitable application records found"_, and the bundle
identifier has to match `au.com.crumpet.ios` exactly.

**Internal testers are the fast path.** Up to 100, no review, the build is available as soon as
Apple finishes processing it. External testers (up to 10,000) need one Beta App Review, roughly a
day, and only for the first build. So a build for one or two people to try is an internal-tester
build and involves no review at all.

`autoIncrement` on the production profile with `appVersionSource: "remote"` is what stops a build
being rejected for reusing a build number. Don't hand-set `buildNumber` in `app.json`.

A **`qa` profile points a store build at the `crumpet-qa` Supabase project** (`bun run build:qa`).
It extends `production`, so it is a TestFlight build with the same Google client IDs, and its own
`env` block swaps only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY`. A profile's
`env` wins over the EAS environment, which is the whole trick. `submit.qa` is empty for the same
reason `submit.production` is.

**It is not a `qa` EAS environment, because EAS will not make one.** Custom environments need the
Production or Enterprise plan; on this plan `eas env:set --environment crumpet-qa` fails with
"Custom environments are supported on Production and Enterprise plans". Both values in the block
are public — they ship inside the app — so committing them costs nothing.

**A QA build and a production build are the same app in TestFlight.** Same bundle id, one build
number sequence. Nothing on the tester's phone says which backend a build talks to; the build
number and the TestFlight "What to Test" note are the only tells, so write the backend there.

**QA sign-in needs the providers on the QA project.** As of 2026-09-18 Google and Apple are off on
`crumpet-qa`, so a QA build signs in with email only until someone enables them in the dashboard
with the same client IDs as production. QA also has no custom SMTP, so auth emails go through
Supabase's rate-limited default sender.

`preview` and `production` still point at production data, as does `development` and the local
`.env`.

No Android build scripts until FCM credentials exist.

## Release notes and the feedback board

Every store build and every over-the-air update carries its own entry in
`src/constants/release-notes.ts`. The What's New sheet and the changelog in Settings read it.

**Before the build:**

1. Bump the patch in `app.json` and `package.json` (`1.0.1` → `1.0.2`). An over-the-air update
   leaves both alone and adds a 4th number to its release only (`1.0.2.1`), because the native
   version cannot change over the air.
2. Add the release at the top of `RELEASES`. `bun run check` fails when its first three parts do
   not equal `app.json`'s version.
3. Search the feedback board for a request each change answers, and put its id in
   `featureRequestId`.

**After the build is live on TestFlight:** set each linked request to `done` on the board. Not
before: the board would say "done" while nobody has the build.
