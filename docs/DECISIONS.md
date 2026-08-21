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


---

## 2026-08-21

**The Posts photo is full-bleed, and PostBody owns the gutter.** Matching Hevy means the picture
reaches both screen edges, which no parent can allow while it is padding its children. So the
gutter moved down into `PostBody`, which re-indents its own words and lets the carousel through at
full width. Both surfaces that render a Post — the tab and Post Detail — now hand it the whole
width. The card lost its radius, shadow and background in the same move: a frame drawn around a
picture that has already left it reads as a mistake.

**The pager dots sit on the photo, not under it.** Below the frame they cost a row of height on
every multi-photo Post and split the pager into two things that do not look related. The scrim
behind them is what keeps them legible on a pale photo, which is the reason the dots were outside
the frame to begin with.

**The Posts tab reads every Household at once.** `PostService.list` takes `householdIds`, and the
keyset paging is unchanged — the order was always over the whole result, never per household, so a
page boundary does not care how many Households its rows came from.

**There is no filter on the Posts tab, and that was a deliberate cut.** One was built — a chip row
per Household — and removed before it shipped. Three reasons. Almost every Member holds one
Household and would never see the control. For the two-Household case the label on each card
already answers "which house is this" with no tap, which is the question people actually ask; "show
me only that house" is far rarer. And the filter introduced two bugs of its own: a narrowed
selection that stranded the tab on an empty list with no control left on screen to reset it, and
sharing from a narrowed tab writing the Post to a different Household than the one being read.

Cutting it also removes a real teaching problem. The household switcher sets the Active Household
and governs every other surface; a filter that governed only this one meant two controls answering
"which Household", with a rule to explain. Build the filter when a Member says the tab is noisy —
they will name the axis, instead of us guessing between Household, unseen and Pet.

**The Household name is the Post's first line, above the author.** Grey text in a metadata line is
not something the eye sorts by, and which house a photo came from is the first thing a Member of
several of them asks. A Member of one Household sees the author on that line, as before.

**Post permissions are read from the Post's own Household.** With the tab spanning several Households, two
adjacent rows can belong to two Households the viewer holds different roles in, so the old check
against the Active Household's `isOwner` was wrong on every row but one. Both the tab and Post
Detail now look the Household up by `post.householdId`.

**A Like writes to every cached Posts list, and rolls back one Post rather than a snapshot.**
`setQueriesData` over the shared `['posts']` prefix keeps every cached list in step. The rollback
restores the single Post, because a snapshot taken before this tap also predates any Like still in
flight beside it — writing it back emptied a heart that had already succeeded.

**Arriving at the tab marks every Household seen.** Marking only the Active one left a dot on a
Household whose Posts were already on the screen.
