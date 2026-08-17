# Decisions

Small decisions with their reasoning. The tier below an ADR: too minor for
[adr/](./adr/), too consequential to leave in a commit message nobody will find.

**What belongs here:** anything a new contributor would ask "why is it like that?" about, where the
answer is a sentence or two.

**What belongs in an ADR instead:** a decision that changes the shape of the system, where reversing
it means changing several files, or where the alternatives need spelling out.

**This is not a changelog.** Record why it is not otherwise, never what happened. "Added resend to
the verify screen" is worthless. "Resend counts down because Supabase rejects a second email inside
`max_frequency`" is the entry.

Newest first. Append, don't rewrite.

---

## 2026-08-17

**Email codes are six digits, not eight.** `supabase/config.toml` sets `otp_length = 6`, which is
also Supabase's default. `sign-up/verify.tsx` had asked for eight since it was written, and its Zod
schema demanded exactly eight — so emailed sign-up verification could never have passed. One
`verifyOtpSchema` is now shared by both verify screens.

**Password rules apply to sign-up as well as reset.** At least 8 characters, a capital, a lower case
letter, a number. One `passwordSchema` is imported by both, because a rule enforced only at reset
would lock out a Member with a password the app itself let them choose. A test asserts the two
screens agree. Client-side only — Supabase's own password policy is a separate project setting.

**The new-password screen asks for the password twice.** There is no show-password toggle, so a typo
you cannot see would lock you out a second time. Mismatch is reported inline on the confirm field.

**The password reset flow has no store.** The only state to carry is the email, and route params
already do that. A Zustand store would be a second copy of one string. (Reset verifies its code at
the middle step, so unlike some flows there is no code to carry forward.)

**`forgot-password/` deliberately has no `_layout.tsx`.** A folder without one keeps its screens on
the parent stack. Adding a layout creates a nested navigator, which leaves the folder's first screen
with nothing to pop to and the back button vanishes — observed on device, not theorised.

**`UserFacingError` carries the original error as `cause`.** Translating a driver failure into copy
for a person otherwise destroys the only thing that explains it, and `console.error` in every
`onError` ends up printing our own sentence back at us. `logError` prints both.
