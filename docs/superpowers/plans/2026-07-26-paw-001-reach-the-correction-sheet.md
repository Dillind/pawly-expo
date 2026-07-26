# PAW-001 Finish — Reach the Correction Sheet

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close `feat/PAW-001-feed-logging` so it can merge — make the already-built correction sheet reachable, and move its time field onto the native spinner.

**Architecture:** No new features and no database changes. The correction sheet is complete (day/time/notes, the 24-hour Contributor window measured off `created_at`, the Owner exemption, the notes-only fallback, delete) and simply has no way in: Activity renders `FeedLogRow` with an empty handler, and `SlotRow` is not pressable. This is wiring.

**Tech Stack:** Expo SDK 57, React Native, TypeScript, react-hook-form + Zod, `@lodev09/react-native-true-sheet`.

## Why this is its own plan

The branch is already **25 commits, 58 files, +7228 / -250** against `main`. The Double Feed guard — two migrations, a new sheet, and a rewrite of how logging writes — moves to `feat/PAW-002-double-feed-guard`, planned in `2026-07-26-paw-002-double-feed-guard.md`. This plan is what makes the current branch coherent enough to merge: without it, the branch ships a correction sheet no user can open.

Push notifications become **PAW-003**. The spec still says PAW-002 in two places; Task 4 fixes that.

## Global Constraints

- **Branch:** `feat/PAW-001-feed-logging`, already checked out. Never commit to `main`.
- **No test runner exists.** No `test` script, no framework. Do not invent one. Verification is `bun run typecheck`, `bun run lint`, `bun run spellcheck`, and measured on-device checks.
- **Node:** `export PATH="$HOME/.volta/bin:$PATH"` before any `bun run` — the shell's default Node 20 cannot run cspell at all.
- **No database changes in this plan.** No migrations, no `execute_sql` writes. If a task seems to need one, it belongs in PAW-002.
- **DO NOT DELETE any `feed_logs` rows.** Four test logs predate this work and are the user's to review — see Task 4.
- **Before any UI task, invoke `/frontend-design` and `/expo-native-ui`** (AGENTS.md → *Before changing any UI*). Both tasks below repeat it as a first step.
- **Any time a user sets is a `DateTimePickerValidated` with `mode="time"`** (AGENTS.md → *Dates and times*).
- **Measure, don't assert.** On-device claims go through argent's `describe`. Discovery before every tap, never coordinates read off a screenshot.
- **Prose is Australian/British English**; code identifiers stay American. New words go in `cspell.json`, never a disable comment.
- **Prettier:** 100-char width, single quotes, **no trailing commas**, `bracketSameLine: true`.
- **Commit after every task**, ending the message with `Co-Authored-By: Claude <noreply@anthropic.com>`.

## File Structure

| Path | Change |
| --- | --- |
| `src/app/(protected)/(tabs)/activity/index.tsx:99` | `FeedLogRow` gets a real `onPress` |
| `src/components/ui/slot-row.tsx` | Optional press target, used only by a `fed` slot |
| `src/app/(protected)/(tabs)/home/index.tsx` | Hosts the detail sheet; fed slots open their log |
| `src/components/bottom-sheets/feed-log-sheet.tsx` | Time field becomes `DateTimePickerValidated mode="time"` |
| `AGENTS.md`, `cspell.json` | Already modified in the working tree — committed in Task 1 |

**Note the filename:** this plan does **not** rename `feed-log-sheet.tsx`. The rename to `feed-log-detail-sheet.tsx` exists to avoid colliding with `log-feed-sheet.tsx`, which is PAW-002's file, so the rename travels with PAW-002.

---

### Task 1: Commit the working-tree conventions

The tree currently holds two uncommitted changes made while planning: the AGENTS.md rules (`Before changing any UI`, `Dates and times`) and the `cspell.json` words the PAW-002 plan needs. Both belong on this branch — Task 3 below is a direct consequence of the second AGENTS.md rule.

- [ ] **Step 1: Check what is actually uncommitted**

```bash
git status --short
git diff AGENTS.md cspell.json
```

Expected: `AGENTS.md` and `cspell.json` modified; the two plan documents untracked.

- [ ] **Step 2: Verify the gate still passes**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run spellcheck
```

Expected: `Issues found: 0 in 0 files.`

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md cspell.json docs/superpowers/plans/
git commit -m "$(cat <<'EOF'
docs: require the design skills and the time spinner for UI work

Records two conventions: invoke /frontend-design and /expo-native-ui
before any UI change, and take every user-set time through
DateTimePickerValidated mode="time" rather than a text field. Adds the
PAW-001 and PAW-002 plans.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Make the correction sheet reachable

**Files:**
- Modify: `src/app/(protected)/(tabs)/activity/index.tsx` (the `renderItem` handler)
- Modify: `src/components/ui/slot-row.tsx`
- Modify: `src/app/(protected)/(tabs)/home/index.tsx`

**Interfaces:**
- Consumes: `FeedLogSheet` (default export of `@/components/bottom-sheets/feed-log-sheet`, props `{ sheetRef, logId, petId }`), and `SlotState.satisfyingLogId` from `@/types/core`.
- Produces: `SlotRow` gains an optional `onPress?: () => void`. PAW-002 relies on this prop existing.

- [ ] **Step 1: Invoke the required skills**

`/frontend-design` and `/expo-native-ui` before touching a file.

- [ ] **Step 2: Give the Activity row its real handler**

In `src/app/(protected)/(tabs)/activity/index.tsx`, `renderItem` currently ends with `<FeedLogRow log={item.log} timezone={timezone} onPress={() => {}} />`. Replace that element with:

```tsx
      <FeedLogRow
        log={item.log}
        timezone={timezone}
        onPress={() => {
          setActiveLogId(item.log.id);
          void sheetRef.current?.present();
        }}
      />
```

`activeLogId`, `sheetRef` and the `FeedLogSheet` render already exist in this file — this is the same path the notification deep link uses, so a row tap and a notification tap converge on one code path.

- [ ] **Step 3: Make a fed slot pressable**

In `src/components/ui/slot-row.tsx`, add the import:

```tsx
import PressableOpacity from '@/components/core/pressable-opacity';
```

Extend the props:

```tsx
type Props = {
  slot: SlotState;
  timezone: string;
  fedBy: string;
  onPress?: () => void;
};
```

Replace the component body's return with a conditional wrapper. The children are unchanged — only what wraps them differs:

```tsx
const SlotRow = ({ slot, timezone, fedBy, onPress }: Props) => {
  const styles = useStyles(makeStyles);

  const detail =
    slot.state === 'fed' && slot.satisfiedAt
      ? `${fedBy}, ${formatTimeOfDay(slot.satisfiedAt, timezone)}`
      : { fed: 'Fed', due: 'Due now', missed: 'Missed', upcoming: 'Upcoming' }[slot.state];

  const body = (
    <>
      <Icon name={stateIcon[slot.state]} size={18} color={stateColour[slot.state]} />
      <AppText size={16} style={styles.label}>
        {slotLabelText[slot.label]}
      </AppText>
      <AppText size={14} color="textSecondary">
        {formatScheduledTime(slot.scheduledTime)}
      </AppText>
      <AppText size={14} color={stateColour[slot.state]} style={styles.detail} align="right">
        {detail}
      </AppText>
    </>
  );

  // Only a fed slot has a log to open. Every other state stays inert rather
  // than pressable-and-silent, which reads as a bug.
  if (!onPress) return <View style={styles.row}>{body}</View>;

  return (
    <PressableOpacity style={styles.row} onPress={onPress}>
      {body}
    </PressableOpacity>
  );
};
```

- [ ] **Step 4: Host the sheet on Home**

In `src/app/(protected)/(tabs)/home/index.tsx`, add these imports:

```tsx
import FeedLogSheet from '@/components/bottom-sheets/feed-log-sheet';
import type { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useRef, useState } from 'react';
```

Add the state and ref after `const logFeed = useLogFeed(pet?.id);`:

```tsx
  const [activeLogId, setActiveLogId] = useState<string | undefined>(undefined);
  const detailSheetRef = useRef<TrueSheet | null>(null);
```

Replace the `slots?.map(...)` block with:

```tsx
            {slots?.map((slot) => {
              // Captured in a const rather than read inside the closure: TS
              // cannot narrow a property access through a callback, and the
              // alternative is an `as string` cast that would outlive the
              // guard if it were ever removed.
              const logId = slot.state === 'fed' ? slot.satisfyingLogId : null;

              return (
                <SlotRow
                  key={slot.scheduleId}
                  slot={slot}
                  timezone={timezone}
                  fedBy={memberDisplayName(members, slot.satisfiedBy)}
                  onPress={
                    logId
                      ? () => {
                          setActiveLogId(logId);
                          void detailSheetRef.current?.present();
                        }
                      : undefined
                  }
                />
              );
            })}
```

Render the sheet as a sibling, immediately after the `<ActionPopover … />` block and before the closing `</ScreenView>`:

```tsx
      <FeedLogSheet sheetRef={detailSheetRef} logId={activeLogId} petId={pet?.id} />
```

- [ ] **Step 5: Typecheck and lint**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run typecheck && bun run lint
```

Expected: typecheck clean; lint reports the 2 known pre-existing warnings and no new ones. If the count rises, the new one is yours.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: open the correction sheet from Activity and Home

The sheet was already built and simply unreachable: Activity rendered
FeedLogRow with an empty handler and SlotRow was not pressable at all. A
fed slot now opens its satisfying log; slots in other states stay inert,
since there is no log to open.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: The corrected time uses the native time spinner

Required by AGENTS.md → Forms → *Dates and times*. The form currently takes a time through a text field with a `numbers-and-punctuation` keyboard, which is the pattern that rule outlaws. It is verifiable now only because Task 2 made the sheet reachable.

**Files:**
- Modify: `src/components/bottom-sheets/feed-log-sheet.tsx` (the `EditableLogForm` time `Controller` only)

**Interfaces:**
- Consumes: `DateTimePickerValidated` from `@/components/core/date-time-picker-validated` — props `{ mode?: 'date' | 'time'; name?: string; label?: string; selectedDate: string; setSelectedDate: (date: string) => void }`. For `mode="time"` it stores `HH:mm` and displays `h:mm A`, and already renders `display="spinner"` at 216pt on iOS. That stored shape is exactly what `feedLogSchema`'s `TIME_REGEX` validates and `composeLoggedAt` consumes, so nothing else changes.

- [ ] **Step 1: Invoke the required skills**

`/frontend-design` and `/expo-native-ui`.

- [ ] **Step 2: Add the import**

In `src/components/bottom-sheets/feed-log-sheet.tsx`, alongside the other core imports:

```tsx
import DateTimePickerValidated from '@/components/core/date-time-picker-validated';
```

- [ ] **Step 3: Replace the time field**

Replace this block inside `EditableLogForm`:

```tsx
        <Controller
          control={control}
          name="time"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInputValidated
              name="time"
              label="Time fed"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="07:30"
              keyboardType="numbers-and-punctuation"
            />
          )}
        />
```

with:

```tsx
        <Controller
          control={control}
          name="time"
          render={({ field: { onChange, value } }) => (
            <DateTimePickerValidated
              name="time"
              label="Time fed"
              mode="time"
              selectedDate={value}
              setSelectedDate={onChange}
            />
          )}
        />
```

`onBlur` is dropped deliberately: a picker has no blur event, and the form's `mode: 'onBlur'` still validates on submit. `dirtyFields.time` continues to drive the patch, because `onChange` is the field's own setter — so a notes-only edit still produces a patch with no `loggedAt` key, which is the single most important rule in this sheet.

Leave the `TextInputValidated` import in place; notes still use it.

- [ ] **Step 4: Typecheck and lint**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run typecheck && bun run lint
```

Expected: clean, no new warnings.

- [ ] **Step 5: Measure both entry points and the picker on device**

This is the step the whole plan exists for. Follow `argent-ios-simulator-setup`, then `argent-device-interact`. Call `list-devices` first and prefer a booted target rather than assuming last session's simulator still exists. **Discovery before every tap.**

1. Launch the app, land on Home. `describe` → confirm today's slots render.
2. Tap a slot showing **fed**. `describe` → expect the sheet, headed with the author, day and time.
3. In the sheet, `describe` → find `Time fed`. Tap it.
4. `describe` → confirm the native time spinner is presented **over** the sheet, and the sheet is still beneath it.
   - **If the picker does not appear, or dismisses the sheet underneath it:** this is the modal-over-sheet rough edge AGENTS.md warns about. Render the same `mode="time"` spinner inline inside the sheet instead. **Reverting to a text input is not the fallback** — the rule is the control, not the presentation.
5. Change the time, confirm. `describe` → the field reads the new time in `h:mm A` (e.g. `4:25 PM`).
6. Tap `Save changes`. `describe` → expect a `Feed updated` toast, the sheet dismissed, and the Home slot row showing the corrected time.
7. Tap a slot in `upcoming`, `due` or `missed`. Expect **nothing** — no sheet, no press feedback.
8. Go to Activity. `describe` → tap a feed log row. Expect the same sheet.
9. Open a log and edit **only** the notes. Save. `describe` → the toast appears and the logged time is unchanged. This is the regression that matters: a picker that writes on mount would move a time the user never touched.

Note in the commit message which of these were observed, and whether the picker presented modally or needed the inline fallback.

- [ ] **Step 6: Commit**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run spellcheck
git add -A
git commit -m "$(cat <<'EOF'
feat: correct a feed time with the native time spinner

Replaces the HH:mm text field, per the Dates and times rule in
AGENTS.md. The stored format is unchanged, so feedLogSchema and
composeLoggedAt are untouched, and a notes-only edit still sends no
loggedAt.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Resequence the spec, then PR

**Files:**
- Modify: `docs/superpowers/specs/2026-07-26-double-feed-guard-and-push-notifications-design.md`

- [ ] **Step 1: Renumber the tickets in the spec**

The spec's header reads `**Branches:** feat/PAW-001-feed-logging (part 1), feat/PAW-002-push-notifications (part 2)`. The guard has moved to its own branch, so push notifications shift by one. Update the header to:

```markdown
**Branches:** `feat/PAW-002-double-feed-guard` (part 1),
`feat/PAW-003-push-notifications` (part 2)
```

Then update the two headings in the **Sequencing** section the same way, and correct its step 1 — "Commit the existing `ActionPopover` work" is already done, as `59b0d7f`, and steps 4 and 5 (reaching the correction sheet) ship in this PAW-001 PR rather than with the guard.

- [ ] **Step 2: Record what was measured about the dev data**

Add to the spec's **Open items**, replacing the existing "Four test feed logs" bullet:

```markdown
- **Four test feed logs and a nonsense schedule in the dev database.** All four
  logs are 26 July, Bailey, no notes, not backdated. Three (3:05, 3:19, 3:20 pm)
  fall outside every Grace Window and are useful fixtures for the snack case;
  the fourth (4:25 pm) satisfies dinner. The schedule itself is test data —
  `lunch` 12:00, `morning` 13:00, `dinner` 17:00, 60-minute window — so Home
  renders "Morning — 1:00 PM". The overlapping lunch/morning windows make the
  spec's worked counter-example (a log equidistant between two slots) reachable
  without constructing anything, so both are kept deliberately. Fix the schedule
  through the app once editing a schedule exists.
```

- [ ] **Step 3: Full gate**

```bash
export PATH="$HOME/.volta/bin:$PATH"
bun run typecheck && bun run lint && bun run spellcheck
```

Expected: typecheck clean, spellcheck 0 issues, lint at the 2 known pre-existing warnings.

- [ ] **Step 4: Verify against reality, not memory**

Invoke `superpowers:verification-before-completion`, then confirm by looking:

- `grep -rn "onPress={() => {}}" src/` returns nothing.
- `grep -rn "keyboardType=\"numbers-and-punctuation\"" src/` returns nothing.
- The four test logs are still present and untouched:
  ```sql
  select count(*) from public.feed_logs;
  ```
  Expected: 4, plus any created by the on-device checks in Task 3. **Delete nothing.**

- [ ] **Step 5: Commit and open the PR**

```bash
git add docs/
git commit -m "$(cat <<'EOF'
docs: move the Double Feed guard to PAW-002

Push notifications become PAW-003. Records what the dev database
actually contains, and why the test logs and the odd schedule are kept.

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

Then invoke the `create-pr` skill — it owns the PAW-nnn and PR-title conventions. Title: `[PAW-001] Add feed logging`.

**The PR body must say what is deliberately absent**, or a reviewer will read it as an oversight:

1. **There is no Double Feed guard yet.** Logging writes immediately. That is PAW-002, specified and planned.
2. **`double-feed-sheet.tsx` is on this branch and has no caller.** It is deleted in PAW-002, which replaces it with an inline warning. Flag it so a reviewer does not spend time on a file that is already condemned.
3. **The dev schedule is nonsense** (`morning` at 13:00) and the four test logs are unreviewed. Both are kept on purpose — see the spec's Open items.
4. This is a large PR: 25+ commits, ~58 files. Suggest reviewing it by commit rather than as one diff.

---

## Notes for whoever executes this

- **No task here touches the database.** If one appears to need a migration, stop — it belongs in PAW-002.
- **Task 3 Step 5 is the whole point of this plan.** Do not shorten it. The notes-only regression check at the end is the one most likely to be skipped and the one most likely to be broken.
- **`bun run lint` has 2 pre-existing warnings**, unrelated to this work. Two before, two after.
