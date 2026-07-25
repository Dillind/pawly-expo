# Pawly — Domain Language

The ubiquitous language for Pawly, a pet-care coordination app. This file is a glossary only — no implementation details. When code or conversation drifts from these terms, the terms win (or the glossary is updated deliberately). Architectural decisions live in [docs/adr/](./docs/adr/).

## People & groups

**Household**:
The group of people who coordinate care for one or more pets, and the top-level unit everything else belongs to. Owns pets, schedules, and feed logs. Has a single timezone (the pet's location).
_Avoid_: Family, group, team, account.

**Member**:
Any person belonging to a household. Umbrella term — every member has a role (Owner or Contributor).
_Avoid_: User (a User is the account; a Member is that account's place in a household).

**Owner**:
A member role with full control: edit/delete anything in the household, manage the schedule, manage pets, and manage members. A household may have more than one Owner. Highest permission level.
_Avoid_: Admin, manager.

**Contributor**:
A member role that can log feeds and edit/delete only their own recent feed logs — nothing else. This is the role a partner, housemate, dog walker, or pet sitter joins as.
_Avoid_: Helper, guest, viewer, collaborator.

**User**:
An authenticated account (email/password). A User may be a Member of a household. Distinct from Member.

**Invite**:
A shareable, revocable, expiring link/code an Owner generates so someone can join the household as a Contributor.
_Avoid_: Referral, share link.

## Pets & care

**Pet**:
An animal cared for by a household (v1: one dog per household in the UI; the model supports many). Stores a birthdate, not a fixed age.
_Avoid_: Animal, dog (the product is pet-general even though v1 targets dogs).

**Feeding Schedule**:
The set of expected daily feed times for a pet (e.g. 07:00, 12:00, 17:00), each expressed as a wall-clock time interpreted in the household's timezone.
_Avoid_: Meal plan, routine.

**Scheduled Time** (or **Slot**):
A single expected feed time within a Feeding Schedule.
_Avoid_: Meal, feeding time.

**Feed Log**:
A record that a pet was fed — who fed it (`logged_by`), when (`logged_at`, adjustable/backdatable), and optional notes. The core action of the app.
_Avoid_: Feed event, meal record, entry.

**Activity**:
The household's chronological history of Feed Logs. The word for this history, in both the product and the UI.
_Avoid_: **Feed** (reserved for the act of feeding — a Feed Log, a Missed Feed), timeline, stream, news feed. Naming this surface "the feed" invites the social-stream product that PRODUCT_BRIEF puts explicitly out of scope.

**Grace Window**:
The interval either side of a Scheduled Time within which a Feed Log counts as Satisfying that slot — symmetric, so a 60-minute window makes 06:00–08:00 satisfy an 07:00 slot. Feeding early is as ordinary as feeding late, and an early feed must never leave a slot looking unfed. Configured per household (default 60 minutes).
_Avoid_: Buffer, tolerance, timeout.

**Satisfying Feed**:
The Feed Log that fulfils a given Scheduled Time: the one nearest that slot among the logs falling inside its Grace Window. A slot has at most one Satisfying Feed, and a Feed Log satisfies at most one slot. A log outside every Grace Window satisfies nothing — it is a valid, recorded feed that simply belongs to no slot (a snack, an extra feed).
_Avoid_: Matching feed, qualifying log.

**Missed Feed**:
A Scheduled Time with no Satisfying Feed by (Scheduled Time + Grace Window). Triggers a Missed Feed Alert to the whole household.
_Avoid_: Skipped feed, overdue meal.

## Notifications

**Feed Logged Alert**:
The immediate push to all household members when a member logs a feed ("[Person] fed [Pet]").

**Missed Feed Alert**:
The push to all household members when a Missed Feed is detected server-side.

**Double Feed**:
Two feeds for effectively the same slot (the pet fed twice). The app warns at log time if a recent feed already covers the slot.
_Avoid_: Duplicate feed, over-feed.
