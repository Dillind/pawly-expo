# 37. A person is named by their first name

Date: 2026-09-10

## Status

Accepted. Supersedes the Username introduced by [issue #167](https://github.com/Dillind/pawly-expo/issues/167)
and [issue #172](https://github.com/Dillind/pawly-expo/issues/172).
Implements [issue #178](https://github.com/Dillind/pawly-expo/issues/178).
Unblocks [issue #169](https://github.com/Dillind/pawly-expo/issues/169), the Household Handle.

## Context

A Username sat on the User. It was unique, lowercase, 3 to 20 characters, asked for during
onboarding, and read wherever the app named a person — a Post header, a comment, the `@name` reply
prefix, a push.

Then a Household needed one too. A follow link is the only way to find a household, which works
when somebody is standing next to you and fails for the case that actually happens: you are told
about a household in conversation and there is nothing to type. The fix is a short, unique name on
the Household.

That is two handles, one on each. Two unique namespaces, two settings screens, and no way for
anyone to know which one to hand over. Worse, the thing a person searches for is a Household. A
person inside a Household is already known to the other members, so the user-side handle solved a
problem nobody had.

## Decision

**The user-side Username is removed. A person is named by their first name.**

`formatAuthorName` returns `firstName ?? 'Someone'`. The push copy keeps its own copy of the rule,
because an Edge Function cannot import from `src/` — the two must be changed together.

**The fallback word is not 'Member'.** A Follower writes Comments and is never a Member. `CONTEXT.md`
is explicit about that word under the Follower entry, and the fallback appears on exactly the
surface where a non-Member is named. 'Someone' is true of both.

**The `@` goes with it.** The reply prefix reads "Replying to Sarah" on a line of its own. An `@` is
borrowed from handles, and once no person has one it promises a tap target that does not exist.
After this, `@` means a Household Handle and nothing else.

**No backfill.** The seven usernames in production are test accounts. None is copied onto a
Household as a seed: a person's username is not a household's name, and a household with two Owners
has no answer for whose to take.

## Consequences

**Two members of one household called Sarah now read as one person.** Accepted. Both first name and
last name are already mandatory at the form layer, so the fix — "Sarah C." — is available whenever
it is wanted. It is not built now, because disambiguating needs the set of every name on the screen,
and that rule cannot live inside a single function.

**Onboarding drops to one step.** The `(onboarding)` group stays, holding `name` alone, and its
`Stack.Protected` guard is what holds a person with no first name. The group is not flattened into
the protected stack, so a second step can return.

**The deploy has an order.** `send-alerts` reads the column, so it deploys before the migration. Out
of order, every push names "A member" for as long as the gap lasts.

**`private.handle_new_user()` is rewritten, not dropped.** It inserts `username` on every signup.
This is the object that breaks something on the way in rather than on the way out, and it is the one
the issue's list of migrations missed.

**The suggestion logic survives.** `private.seed_username` and `public.username_suggestions` are
dropped, but stay readable in their migration files. The Household Handle wants the same "stem is
too thin" rule and copies it from there.

## Alternatives considered

**Keep both handles, and disambiguate by context.** Rejected. The ambiguity is not in the code, it
is in the conversation: "what's your handle" has two answers and no way to tell which is wanted.

**Keep the Username and give the Household nothing.** Rejected. It leaves the follow link as the
only route to a household, which is the problem the Handle exists to solve.

**Make the Username a display name — non-unique, optional.** Rejected. A non-unique name that is not
the person's actual name is a nickname, and it earns nothing that the first name does not already
give. It also keeps a settings screen alive for a field with no job.
