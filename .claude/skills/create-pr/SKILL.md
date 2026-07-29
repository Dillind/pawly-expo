---
name: create-pr
description: Create a pull request for the crumpet-expo repository. Always invoke this skill when the user asks to open, raise, submit, or create a PR or pull request. This skill bases the description on ALL committed changes on the branch vs the base branch — not just recent commits, not uncommitted files, not conversation context. Use this even if the user hasn't explicitly said "use the PR skill" — anytime a PR is being created.
---

# PR Creation — crumpet-expo

Creates a GitHub pull request using the project's PR template, derived entirely from what has actually been committed to the branch.

## Branch naming

Every feature or non-trivial change gets its own branch, named **before** work starts:

```
<type>/CRU-<nnn>-<kebab-case-slug>

feat/CRU-004-home-missed-feeds
fix/CRU-014-missed-feed-timezone
chore/CRU-022-bump-expo-57
```

> The prefix was `PAW-` up to and including `PAW-003`, when the app was called
> Pawly. `CRU-` starts at 004 — the **numbering is continuous**, only the prefix
> changed, so there is exactly one ticket 004 and no ambiguity about ordering.
> Existing `PAW-` branches, commits and PR titles are history and stay as they
> are; never retroactively renumber them.

- `<type>` matches the commit-type vocabulary: `feat`, `fix`, `chore`, `docs`, `refactor`.
- Ticket ID is **uppercase**, zero-padded to three digits.
- Slug is kebab-case, matching the repo's file naming.
- Git refnames forbid spaces and `[` — never try to put brackets in a branch name. Brackets appear in the PR *title* only.

### Allocating the next ID

IDs are derived from git history, not from an external tracker. Take the highest existing number across **both** prefixes and add one — the sequence is shared, so a lookup that only matched `CRU-` would hand out 001 again:

```bash
{ git branch -a --format='%(refname:short)'
  git log --all --format='%s'
  gh pr list --state all --limit 200 --json title,headRefName -q '.[].title,.[].headRefName' 2>/dev/null
} | grep -oE '(PAW|CRU)-[0-9]+' | sort -t- -k2 -n | tail -1
```

Whatever prefix that highest match carries, the **new** branch always uses `CRU-`. Empty output means none exist yet — start at `CRU-001`. Run this against a **fetched** repo (`git fetch --all --prune` first) so a teammate's pushed branch isn't missed and the same ID handed out twice.

If the user supplies an ID explicitly, use theirs — don't re-derive.

### Never commit straight to `main`

If work has already landed on `main` uncommitted, branch first, then commit. Small doc-only or config touch-ups are the exception; anything a reviewer would want to read gets a branch.

## Core Rule: committed changes only

Base EVERY section of the PR description on the output of these three commands:

```bash
# All commits on this branch vs base
git log main..HEAD --oneline

# All files changed across those commits (no uncommitted files)
git diff main...HEAD --name-only

# Full diff to read what actually changed
git diff main...HEAD
```

Never include:

- Files that are modified but not committed (`git status` dirty files)
- Things discussed during development that aren't reflected in the diff
- Assumptions about what was intended — only what the diff shows

## Step 1: Gather the evidence

Run all three commands above. Read the full diff carefully before writing anything.

## Step 2: Write the PR description

Use this exact template. Write from the perspective of a reviewer who has never seen this code before and needs to understand, verify, and approve the change.

```
## What does this PR do?
[Clear explanation of what this PR changes and why.
"Adds X so that Y" or "Fixes the issue where Z" — not a task summary.
A reviewer reading this should understand the intent without reading the code.]

## Extra Info / Things to note
[Non-obvious decisions, side effects, feature flags, dependencies on other PRs,
database migrations, or anything a reviewer should be aware of.
Omit this section entirely if there's nothing notable.]

## How to Test
[Concrete, numbered steps a reviewer can follow to verify the change works.
Name the exact screen, flow, or action. State what to expect at each step.
Bad: "Test the feature." Good: "1. Sign in with an account that has no household → confirm you land on the pet-details onboarding screen → fill it in and tap Next → confirm you reach the feeding-schedule screen."]

## Screenshots (if appropriate)
[Leave blank for the user to fill in manually.]
```

### Tips for each section

**What does this PR do?**: One to three sentences. Focus on the user-visible or system-level effect, not the implementation details. If the change spans multiple features, use a short bullet list. Use this project's domain language (see `CONTEXT.md`) — Household, Member, Owner, Contributor, Pet, Feeding Schedule, Feed Log, etc. — rather than looser terms like "user" or "group".

**Extra Info**: This is the place for the "gotchas" — things that look odd in the diff but are intentional, or things a reviewer needs to know before they can properly evaluate the change. Call out any Supabase migrations included in the diff (`supabase/migrations/`) explicitly and whether they've already been applied to the live project — those aren't undone by just reverting the PR. Skip this section entirely if there genuinely isn't anything notable.

**How to Test**: Numbered steps. Be specific about the exact screen/route (e.g. "`(protected)/(onboarding)/pet-details`") and navigation path. State what the reviewer should see at the end of each step. If there are multiple scenarios (happy path + edge case, e.g. a Zod validation error), list both. If the change was verified on the iOS simulator, say so and note what was checked there.

## Step 3: Construct the PR title

Format: `[CRU-XXX] Short descriptive summary`, under 70 characters including the prefix.

Take the ticket ID **and its prefix** from the branch name — do not allocate a new one at PR time, and do not "modernise" a `PAW-` branch into `CRU-`. A branch named `feat/PAW-003-push-notifications` gets the title `[PAW-003] …`; the title has to match the branch a reviewer is looking at. If the branch carries no ticket ID at all (an older branch, or one created before this convention), leave the prefix off rather than inventing an ID.

## Step 4: Push and create the PR

PRs are created as **drafts by default**. Only omit `--draft` when the user explicitly says they want the PR ready for review (e.g. "not a draft", "ready for review", "publish it") — draft is the safer default for a change that hasn't been explicitly signed off on yet.

```bash
# Push if not already pushed
git push -u origin HEAD

# Create the PR as a draft (default)
gh pr create --draft --title "<title>" --body "$(cat <<'EOF'
## What does this PR do?
...

## Extra Info / Things to note
...

## How to Test
...

## Screenshots (if appropriate)

EOF
)"
```

## Step 5: Return the URL

Output the PR URL so the user can review and share it.
