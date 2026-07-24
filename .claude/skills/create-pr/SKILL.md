---
name: create-pr
description: Create a pull request for the pawly-expo repository. Always invoke this skill when the user asks to open, raise, submit, or create a PR or pull request. This skill bases the description on ALL committed changes on the branch vs the base branch — not just recent commits, not uncommitted files, not conversation context. Use this even if the user hasn't explicitly said "use the PR skill" — anytime a PR is being created.
---

# PR Creation — pawly-expo

Creates a GitHub pull request using the project's PR template, derived entirely from what has actually been committed to the branch.

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

Keep it under 70 characters. A short, descriptive summary of the change — this project doesn't use ticket/issue tracking, so no ticket prefix.

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
