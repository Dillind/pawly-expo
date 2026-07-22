---
status: accepted
---

# Email verification and password reset use OTP codes, not magic links

Sign-up confirmation and password reset both use Supabase's 6-digit One-Time-Password flow (`{{ .Token }}` in the email template + `supabase.auth.verifyOtp()`), not the default `{{ .ConfirmationURL }}` magic-link flow.

## Considered options

- **Magic link (Supabase default)** — email contains a link that opens Safari, which hands back to the app via the `pawlyapp://` deep-link scheme already configured for household invites (ADR 0003). Rejected for v1: the RN client is configured with `detectSessionInUrl: false`, so a magic-link redirect needs the app to manually parse the incoming URL and call `exchangeCodeForSession` — extra plumbing, and an app-switch-to-Safari-and-back hand-off is a rougher mobile UX than staying in-app.
- **OTP code** (chosen) — user types a 6-digit code into an in-app screen, verified via `supabase.auth.verifyOtp({ email, token, type })`. No browser hand-off, no deep-link parsing. Requires editing the "Confirm signup" and "Reset password" email templates in the Supabase dashboard to use `{{ .Token }}` instead of the default link (also where Pawly branding is added — see Task 3 of the implementation plan).

## Consequences

- `pawlyapp://` stays reserved for household invites only (ADR 0003); auth never needs deep-link handling.
- Both signup and password-reset flows need an extra in-app "enter the code" screen. Signup's ships now (`sign-up/verify.tsx`); password-reset's is deferred (see `docs/superpowers/plans/2026-07-22-supabase-auth-foundation.md`, Task 10) but should follow this same decision when it's built.
- Supabase's built-in email sender is rate-limited and best-effort only, regardless of link-vs-code — a custom SMTP provider (Dylan's plan: AWS SES) is still required before real users sign up. Not a consequence of this decision specifically.
