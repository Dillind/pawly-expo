---
name: eas-release
description: How this repo builds and ships iOS through EAS and TestFlight. Read before running eas build or eas submit, before a TestFlight or App Store release, when choosing a build profile, when a build fails on missing EXPO_PUBLIC_ env vars, or when adding a qa profile.
---

# Releasing Crumpet through EAS

The build scripts always name a profile, deliberately. A bare `eas build` defaults to
**production**, whose EAS environment holds no variables, so the build dies at
`src/lib/supabase/client.ts` with "Missing EXPO_PUBLIC_SUPABASE_URL or
EXPO_PUBLIC_SUPABASE_KEY". Only the `development` environment is populated -- `.env` is
gitignored and never reaches the builder, so anything the app reads from
`process.env` has to exist as an EAS environment variable too (`eas env:list`).

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

A **`qa` profile is still absent, but the reason it was absent has gone.** The qa/production split
is two _store_ builds pointing at two _backends_, both going through TestFlight, and the note here
used to say it earns its keep once a non-production Supabase project exists. **One does now** —
the `crumpet-qa` project, created 2026-08-20, carrying the same schema as
production and its own users. So a `qa` build would no longer be a second binary on the same
database, which was the whole objection.

Adding one is not just an `eas.json` entry. It needs a **`qa` EAS environment** holding that
project's `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` — `.env` never reaches the
builder, so anything read from `process.env` has to exist there too (`eas env:list`). It also needs
a `submit.qa`, because `--auto-submit` runs the submit profile whose name matches the build profile.
Until someone does that, `preview` and `production` are the only two profiles, and **both point at
production data**.

No Android build scripts until FCM credentials exist.
