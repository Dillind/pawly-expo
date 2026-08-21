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

## 2026-08-21

**Every stack header is declarative, not `options`.** SDK 57 gives `Stack.Title`, `Stack.Header`,
`Stack.Toolbar` and `Stack.Screen.BackButton` as children of `Stack.Screen`. They replace
`headerTitle`, `headerRight` and `headerBackButtonDisplayMode` across every layout.

**They cannot be wrapped in a component.** `Stack.Screen` reads its direct children only, so a
shared `ScreenHeader` component was tried and abandoned — the bar fell back to the route name,
`index`. `HeaderTitleStyle` in `constants/theme.ts` is what can be shared.

**The bar is transparent with no blur.** `<Stack.Header transparent />`. Content scrolls under it
and the title sits level with the toolbar button, which is the effect Hevy has. A blurred bar keeps
the title readable over a photo and a clear one does not — that trade was weighed and the clear bar
chosen deliberately.

**A native title is left-aligned with a wide wrapper, not with an option.** `headerTitleAlign:
'left'` is ignored by the native stack, and a left `Stack.Toolbar.View` draws its own glass pill on
iOS 26 and leaks the route name into the centre slot. Both were tried on a simulator. What works is
`Stack.Title asChild` over a `View` given an explicit width wider than the title slot: UIKit centres
the slot, so a box that overruns it starts at the left margin.

**`Stack.Toolbar.Button` replaces `HeaderIconButton` in a bar.** It takes an SF Symbol rather than a
Lucide icon, and it is a real bar button item, so it matches the back button by construction instead
of by a hand-measured 36x40 box.

**A transparent header insets nothing but the bar.** Every screen behind one needs `edges={[]}` on
its `ScreenView` and `contentInsetAdjustmentBehavior="automatic"` on its scroller, or its first row
hides under the title.

**The `household` route group is now `posts`.** The folder held the posts feed while `Household` is
a domain object with its own screens elsewhere, so the name pointed at the wrong thing. The tab
trigger, every `href`, and the push payload in `send-alerts/message.ts` moved with it. The function
is redeployed (v8 on `crumpet`).

**`use-push-notifications` rewrites `/household` to `/posts` on the way in.** A notification
delivered before the rename sits on the phone until it is tapped, carrying the old path. Without the
rewrite those taps land on Unmatched Route. It can be deleted once no undelivered notification
predates 2026-08-21.

**Home's switcher is a `Stack.Title asChild`, with no pill.** The native title slot does hold a
control. The earlier attempts failed because the wrapper `View` hugged its content and collapsed;
an explicit `width` fixes it. The switcher draws its own chevron circle, so no glass pill remains.

**The title slot also avoids the back-button stretch.** iOS animates the left bar-item group across
a push, so a custom `Stack.Toolbar.View` hands its geometry to the next screen's back button, which
then draws its background as a wide rectangle for the whole push. `hidesSharedBackground` makes it
worse, not better. A title is outside that group, so the fault cannot occur — which is the second
reason the switcher is a title and not a left bar item.

**The bell is a native `Stack.Toolbar.Button` with a `Stack.Toolbar.Badge`.** The hand-rolled
`NotificationBell`, with its absolutely-positioned badge, was deleted — a custom right-hand view
carries the same transition cost as the left one, for a control the platform already draws.

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
