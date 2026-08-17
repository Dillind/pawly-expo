# 0028. A recovery session is held outside the app until the password is set

Date: 2026-08-17

## Status

Accepted.

## Context

Password reset (CRU-025) is three screens inside `(public)/(auth)`: ask for the email, type the
code, choose a new password.

The middle step calls `verifyOtp` with `type: 'recovery'`. That call does not merely check the
code — it signs the user in. Supabase issues a real session, `onAuthStateChange` fires, and
`useAuthStore` flips to `signedIn`.

`AuthGate` in `src/app/_layout.tsx` watches exactly that field. So the moment the code is accepted,
the router swaps from `(public)` to `(protected)` and the third screen is never reached. The user
lands on Home having never chosen a password, with the old one still working.

Three ways out were considered:

1. **Move `forgot-password/new-password` into `(protected)`.** It would be reachable, but a password-reset screen
   would then live in the signed-in half of the app, split from the two screens it belongs to.
2. **Do not verify on the verify screen.** Carry the email and the code forward and call `verifyOtp`
   and `updateUser` back to back on the last screen. The session then flips only once the password
   is set, and the guard never sees the intermediate state. But a wrong code is not discovered until
   after the user has typed a new password twice, and the screen that asked for the code is the one
   screen that cannot report it is wrong.
3. **Hold the guard.**

## Decision

Option 3. `useAuthStore` gains an in-memory `isRecovering` flag, and `AuthGate` reads it:

```tsx
<Stack.Protected guard={status === 'signedOut' || isRecovering}>
<Stack.Protected guard={status === 'signedIn' && !isRecovering}>
```

`forgot-password/verify` sets it **before** calling `verifyOtp`, because the call resolving is what flips the
session — setting it afterwards is already too late. A failed verification clears it again.
`forgot-password/new-password` clears it once `updateUser` succeeds, which is what releases the user into
`(protected)`. That screen therefore needs no navigation of its own.

The flag is not persisted. Killing the app mid-reset leaves a signed-in user on Home, which is what
the session says is true — the recovery session is genuine, it is only the flow that was
interrupted. Persisting it would strand someone outside the app with no way back in.

## Consequences

The three screens stay together in `(auth)`, and a bad code is reported by the screen that asked
for it.

The cost is that "signed in" is now two conditions rather than one, in a guard whose whole value is
being obvious. The flag is named for the state rather than the screen, and both writers are inside
the reset flow, so the blast radius is those two files.

The window between verifying and saving is a real session that can do anything the user can. That
is inherent to Supabase recovery, not to this decision — option 2 was the only one that avoided it,
at the cost above. The back button and the swipe gesture are both off on `forgot-password/new-password`, so the
only ways out of the window are finishing it or killing the app.
