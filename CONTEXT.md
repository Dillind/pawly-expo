# Crumpet — Domain Language

The ubiquitous language for Crumpet, a pet-care coordination app. This file is a glossary only — no implementation details. When code or conversation drifts from these terms, the terms win (or the glossary is updated deliberately). Architectural decisions live in [docs/adr/](./docs/adr/).

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
An animal cared for by a household. A household may hold several, and Home shows each one's feed times for today. Stores a birthdate, not a fixed age.
_Avoid_: Animal, dog (the product is pet-general even though v1 targets dogs).

**Pet Details**:
The facts that identify a Pet rather than describe its care — name, breed, sex and birthdate, together with whether that birthdate is only approximate. Captured when the Pet is added and changeable afterwards by an Owner. Age is not among them: it is read from the birthdate, so a Pet's age is always current and "1 year" is a reading rather than a stored value.
_Avoid_: Pet profile (the whole pet screen, Details and Care Card included), bio (the free-text About), pet info.

**Care Card**:
The information a Member needs in order to look after a Pet when they are not the usual carer — allergies, medications and how to give them, vet and emergency vet contacts, microchip and insurance numbers, feeding amounts and notes. A handover document, not a medical record: it holds what a Contributor needs today, never dated clinical history like vaccination or surgery records, which the vet already keeps.
_Avoid_: Health record, medical history, health section (all promise clinical history the Care Card deliberately does not hold).

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

**Alert**:
A notification queued for the Members of a Household. Either a Feed Logged Alert or a Missed Feed Alert. An Alert is recorded whether or not it is delivered — muting silences the push, not the record.

**Feed Logged Alert**:
The immediate push when a Member logs a feed ("[Person] fed [Pet]"). It goes to every Member of the Household except the author, unless that Member has turned Feed Logged Alerts off. Role plays no part in who receives it.

**Missed Feed Alert**:
The push to all household members when a Missed Feed is detected server-side, unless that Member has turned Missed Feed Alerts off. Nobody is excluded — there is no actor, because the point is that no one acted. The copy names the absent **log**, never the absent meal: "No one has logged Bailey's morning feed", not "Bailey hasn't been fed". The app only ever knows that nobody tapped Log, and most of the time the pet was fed — claiming otherwise is the trust failure PRODUCT_BRIEF calls fatal.

**Nudge Limit**:
After 3 consecutive Missed Feed Alerts for a pet with no Feed Log in between, Missed Feed Alerts stop for that pet until someone logs a feed. Stops a household that set up a schedule and drifted away from being nudged three times a day forever. Counted per pet, so one dormant pet never silences another.
_Avoid_: Snooze, cooldown, rate limit.

**Suppressed Alert**:
An Alert that was recorded but deliberately not delivered, because the feed it describes was logged too long after it actually happened to be worth interrupting anyone. Distinct from a failed delivery.

**Double Feed**:
A feed logged at a time falling inside at least one Grace Window, where recording it does not increase the number of Satisfying Feeds that day — two feeds for effectively the same slot. A feed outside every Grace Window is never a Double Feed: it is a snack, and a valid recorded feed that simply belongs to no slot. The app warns at log time and the member decides whether to record it anyway.
_Avoid_: Duplicate feed, over-feed.
