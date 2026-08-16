# 27. A name is asked for once, after signing in

Date: 2026-08-17

## Status

Accepted.

## Context

Every surface that names a person reads `public.users.first_name`, which the
`handle_new_user` trigger fills from `raw_user_meta_data` at signup. Only the email
sign-up form ever wrote those keys, and CRU-024 removed the two fields that did it.
Apple and Google never wrote them either: Apple sends a name object once, on first
authorisation only, and Google sends one `full_name` string rather than two columns.

So there are now three ways to reach the app with `first_name` null. The visible cost
is not cosmetic. `create_household` names a household `<first_name>'s Household` and
falls back to `'My'`, so a Google user's household is called "My's Household".

The trigger can be taught the keys the providers actually send, and this change does
that. It is not enough on its own. Apple lets someone edit the name they share and hide
their email behind a relay, so nothing a provider sends can be trusted to be a name the
person would recognise. Something has to ask.

The obvious place is onboarding, except onboarding no longer exists. The gate in
`(protected)/_layout.tsx` that once forced a wizard on anyone without a household was
removed on purpose: a sitter or dog walker has no pets and never will, and the wizard
had no exit for them.

## Decision

Ask for the name in a gated step, and reintroduce `(protected)/(onboarding)` to hold it.
A user whose profile row has no first name sees `(onboarding)/name` instead of the tabs.
Saving the name clears the gate.

Fields are pre-filled with whatever the trigger extracted, so most people confirm and
move on.

## Consequences

**This reverses part of the earlier removal, and deliberately.** The pet wizard was
wrong because it demanded something a whole class of user does not have. A name is
different: everyone has one, one screen answers it, and there is no user for whom the
question is unanswerable. The distinction is what makes a gate acceptable here and not
there. A future step must clear the same bar before joining this group.

**The gate is keyed on the profile row, not on the auth provider.** An email user who
signed up before this change is nameless too, and gets the same step on next launch.
That is the intended behaviour, not a migration gap.

**A loading profile shows the tabs, not the name step.** `profile` is undefined until
the query resolves. Flashing the step at someone who already has a name is worse than a
beat of delay, so the tie goes to the tabs.

**Nothing downstream assumes a name is present.** `formatAuthorName` falls back to
"Member", `toInitials` to "?", `alertSentence` to "Member", and the Care Card's
`concat_ws` already nulls an empty result. Those fallbacks stay; the gate narrows how
often they are reached, it does not replace them.
