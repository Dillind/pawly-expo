---
status: accepted
---

# Supabase session storage uses AsyncStorage, not expo-secure-store

The Supabase client persists its session (access token, refresh token, user metadata) via `@react-native-async-storage/async-storage`, passed as the `auth.storage` adapter. `expo-secure-store` remains installed and configured as a config plugin but is not used for the Supabase session in v1.

## Considered options

- **`expo-secure-store`** — Keychain-backed on iOS, more secure at rest. Rejected for now: a Supabase session object (access token, refresh token, expiry, user metadata) is a JSON blob that can exceed SecureStore's ~2KB per-key limit on iOS, silently failing to persist unless a chunking adapter (splitting the value across multiple SecureStore keys) is written first. That adapter is extra code with no product requirement driving it yet.
- **`@react-native-async-storage/async-storage`** (chosen) — unencrypted on-device storage, but matches `@supabase/supabase-js`'s own quick-start pattern exactly, no custom adapter code needed, and ships today.

## Consequences

- Session tokens sit in unencrypted device storage rather than the iOS Keychain. Accepted trade-off for v1 given no sensitive data beyond auth tokens is stored client-side yet.
- Revisit once there's product pressure to harden this (e.g. before a security review, or if a chunked SecureStore adapter gets built for another reason) — swapping the `auth.storage` adapter in `src/lib/supabase/client.ts` is a contained, one-file change.
