# Missed-feed detection via scheduled Edge Function, household timezone, grace window

Missed-feed alerts are computed server-side by a Supabase **Edge Function on a cron schedule** (not on-device). A feed is considered **satisfied** if any feed log exists between a scheduled time and (scheduled time + the household's grace window); if none does, every household member is notified. This is the project's highest-risk technical spike and must be proven before the rest of the backend is built.

## Key decisions

- **Timezone lives on the Household.** `feeding_schedule.scheduled_time` is a wall-clock time (e.g. 07:00) interpreted in the household's single timezone (the pet's location) — not per-device and not UTC. Without this, "7am" is ambiguous for a contributor (e.g. a dog walker) in another zone.
- **Grace window is configured per household** with a sensible default (60 minutes). Not per-schedule in v1 (unnecessary complexity), not hard-coded (too rigid).
- **Matching is "any feed in the window."** A feed log satisfies a scheduled slot purely by falling in `[scheduled_time, scheduled_time + grace]`. Feed logs are **not** explicitly tied to a schedule slot at log time — this is simpler and robust to backdated logs.
- **Backdating is allowed.** A member can adjust a feed's `logged_at` (the forgot-to-log case). Missed-feed logic therefore keys off `logged_at`, never `created_at`.

## Consequences

- The cron cadence (e.g. every 15 min) bounds alert latency; alerts can fire up to one cadence-interval late. Acceptable for v1.
- Because detection is server-side, alerts work when no member has the app open.
- A DST transition in the household timezone shifts wall-clock schedules correctly, but the day of transition can double- or skip- an hour; acceptable edge case for v1, revisit if reported.
