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

## 2026-08-22

**A gallery photo cannot be promoted to the profile photo.** The profile photo is set only by
uploading a new one through the header's camera button. Tapping a gallery photo opens it full
screen, which is what tapping a photo means, and there is nowhere left for "Set as cover photo" that
does not put an edit action behind a gesture people use to look at things.

**Every write confirms with `.select()`.** A write blocked by RLS matches zero rows and returns no
error, so `.update().eq()` on its own cannot tell a write that landed from one the policy threw
away — the success toast fired while nothing had changed. `assertWrote` in
`src/lib/supabase/assert-wrote.ts` turns the empty result into a `UserFacingError`. The role is
never checked in TypeScript before the write: that would restate the policy in a second place, and
the two would drift. Postgres stays the only authority on who may write.

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
'left'` is ignored by the native stack. A left `Stack.Toolbar.View` draws its own glass pill on iOS
26, leaks the route name into the centre slot, and stretches the next screen's back button — see
below. Both were tried on a simulator. What works is
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

**Removing a Pet moved from the header into the Edit details tray.** As a `Stack.Toolbar.Button` it
needed the pet, the Household role and the mutation, so it sat behind the screen's loading return
and dragged the title behind it with it. In the tray it sits beside every other action on the same
data, and the pencil that opens it is already Owner-only, so the role check comes for free. The
header then holds nothing but the Pet's name.

**`MainButton` gained a `destructiveText` variant.** The existing `text` variant draws its label in
`primary`, which cannot carry a destructive action, and a filled red button beside Save reads louder
than the save it sits under.

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

**A Post has its own surface token, and dark mode inverts it.** `postSurface` and `postDivider`
are new. Light draws a white Post on a tinted band, which is the grouped-list idiom the rest of the
app uses. Dark does the reverse — the Post is pure black and the band between two of them is the
lighter grey. A Post that fills the screen width has no edge of its own, so the band is the only
thing separating one from the next; and in dark a Post drawn on anything but black loses the
photo's own blacks at its top and bottom edge.

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

**A photo opened full screen is a route, not a modal.** The pet gallery and Post Detail both push
`.../photo/[photoId]`, presented as a `fullScreenModal` with `animation: 'fade'`. The first build
used `BaseModal`, and it was wrong twice over: `react-native-modal` orchestrates its animation in
JS, so a full-screen surface arrives with a visible slide that a native push does not have; and the
close button has to be a `GlassView`, which renders almost nothing over a flat page because glass is
a material with nothing behind it to refract. A native screen fixes both at once — iOS draws the
glass circle behind a `Stack.Toolbar.Button` itself, exactly as it does for a back button.

**A Post's photos open only from Post Detail.** On the Posts tab a photo tap opens the Post, and
that stays. `PostPhotoCarousel` takes `onPressPhoto` alongside `onPress`, and only Post Detail
passes it — a tab row is a summary, so tapping into it should reach the Post, not skip past it to
one photo.

**The pet lists are derived from the households query, not fetched.** `HouseholdService.listForUser`
already selects `id, name, photo_url` for every household's pets, and `PetService.listForHousehold`
asked for exactly those three columns again — one more serial round trip before Home could render a
row. `usePets` now reads `household.pets`, and `PetService.listForHousehold` is gone. The cost is
that anything touching a pet's name, photo, or existence has to invalidate `households`; the `pets`
query key no longer exists.

**The query cache has defaults and is persisted to AsyncStorage.** `new QueryClient()` takes
`staleTime: 0`, so every query was stale the moment it landed and a tab switch back to Home re-ran
one occurrence RPC per pet. The default is now 30s, five minutes on `households` and
`household-members` (both only change through mutations that invalidate them), and 15s on
occurrences, which age on their own and are already polled every 60s while Home is open.
`PersistQueryClientProvider` writes the cache to AsyncStorage so a warm start paints the last known
shape instead of an empty screen. The cache is per-account and AsyncStorage is not, so ending a
signed-in session clears both copies — `useCacheReset` watches the auth status rather than living in
`useLogout`, because a revoked token never goes through the logout button.

**Home's loading state is two skeleton pet cards, not a spinner.** They are built from the same
measurements as a collapsed `PetSection`, and the "Today" heading renders during the wait too, so
nothing below moves when the pets arrive.

**A profile photo gets its own bucket, and every member surface reads it.** `user-avatars` mirrors
`post-photos` — public, path `{user_id}/{uuid}.jpg`, a member may only write under their own folder.
It is a separate bucket rather than a folder inside `pet-photos` because the two have different
owners: a pet photo belongs to a household, an avatar belongs to a person, and one storage policy
cannot express both. `UserAvatar` is the component every surface now draws, falling back to
`AvatarInitials` when there is no photo, so widening the three selects that carry a member — the
post author, a post's likers, and the household member list — was the whole of the display work.
`alert-row` is deliberately not among them: its names come out of the `list_alerts` SQL function,
which would need a migration to carry an avatar, and it has never drawn one.
