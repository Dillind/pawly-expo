# Crumpet — Domain Language

The ubiquitous language for Crumpet, a pet-care coordination app. This file is a glossary only — no implementation details. When code or conversation drifts from these terms, the terms win (or the glossary is updated deliberately). Architectural decisions live in [docs/adr/](./docs/adr/).

## People & groups

**Household**:
The group of people who coordinate care for one or more pets, and the top-level unit everything else belongs to. Owns pets, schedules, and feed logs. Has a single timezone (the pet's location).
_Avoid_: Family, group, team, account.

**Member**:
Any person belonging to a household. Umbrella term — every member has a role (Owner or Contributor).
_Avoid_: User (a User is the account; a Member is that account's place in a household).

**Active Household**:
The one Household a User is currently working in, when they belong to more than one. It decides
what the app acts on: which Pets Home shows, which timezone the day is measured in, which
Household a new Post is written to, and which Household's settings the Profile tab edits. Chosen
with the household switcher and remembered on the device rather than on the account — it is where
this phone is pointed, not a fact about the person, so switching on a phone does not change what
the same account shows on a tablet. A User in one Household has an Active Household too; they
simply never see the control.
_Avoid_: Current household, selected household, workspace, context.

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
The set of Feed Times for a pet. Each is a wall-clock time interpreted in the household's timezone.
_Avoid_: Meal plan, routine.

**Feed Time**:
One expected feed, named by the Member — "Morning", "Dinner", "Medication with breakfast" — with a time and the days it applies to. This is the word on screen and the word in conversation.

A Feed Time is **versioned**: editing one closes the current version and opens a successor, so a day already gone keeps the time it had. The stable identity across versions is the **series**, which is what alerts refer to. See ADR 0030.
_Avoid_: Scheduled Time (retired), meal, and **slot** — retired everywhere, including code.

**Occurrence**:
One instance of a Feed Time on a given date — Bailey's dinner on 19 August. Computed from the Feed Time when a day is read, never stored ahead of time. **An internal term**, taken from RFC 5545, which is where the whole industry's vocabulary for this comes from. A Member reads the name and the time, never this word.
_Avoid_: Slot, instance, event.

**Feed Log**:
A record that a pet was fed — who fed it (`logged_by`), when (`logged_at`, adjustable/backdatable), and optional notes. The core action of the app.
_Avoid_: Feed event, meal record, entry.

**Activity**:
A Pet's chronological history of Feed Logs. The word for this history, in both the product and the UI. It is not a Household-wide surface and does not own a tab — "when did Bailey last eat" is the question people ask, so the history is read per Pet.
_Avoid_: **Feed** (reserved for the act of feeding — a Feed Log, a Missed Feed), timeline, stream, news feed. Naming this surface "the feed" invites the public social product PRODUCT_BRIEF still puts out of scope. Do not confuse Activity with the Posts tab: Activity is feeding history, the Posts tab holds Posts.

**Grace Window**:
How long an Occurrence may go unlogged before the household is nudged. A 60-minute window on a 18:00 dinner nudges at 19:00. Configured per household (default 60 minutes).

It decides **how long the app waits after a feed time** before it nudges, and nothing else. The nudge that goes out *before* a feed is governed by the Lead Time, a separate setting with a different owner — the Grace Window belongs to the Household, a Lead Time belongs to a Member. It used to also decide which Feed Time a log belonged to, and that second job is what made late logging confusing — see ADR 0029. The window is no longer symmetric, because it no longer identifies anything: an early log names its Feed Time like any other.
_Avoid_: Buffer, tolerance, timeout.

**Satisfying Feed**:
The Feed Log that fulfils an Occurrence. The Member names it when they log, so the link is **stored**, not inferred. An Occurrence has at most one Satisfying Feed, and a Feed Log satisfies at most one Occurrence.
_Avoid_: Matching feed, qualifying log.

**Extra Feed**:
A Feed Log that names no Feed Time — a snack, or a feed that is not on the schedule. **Deliberate**: a Member chooses it, through "Log something else". It is no longer what happens to a late log. Logging dinner two hours late records dinner, late.
_Avoid_: Snack (guesses at the food), unscheduled feed, ad-hoc feed.

**Paused**:
A pet expects no feeds for a date range — boarding, a vet stay, fasting before surgery. No Occurrences, no nudges, no Missed Feeds. A paused pet still appears on Home, because hiding it would read as deleted.
_Avoid_: Disabled, off, holiday mode.

**Instructions**:
Free text on a Feed Time saying what the pet gets — "half a tin of wet food + 1 cup dry". Shown to whoever is logging that feed, which is what makes the app useful to a sitter. Deliberately not a structured amount: a number and a unit invites totals and charts the app cannot stand behind.
_Avoid_: Portion, serving, amount, dosage.

**Missed Feed**:
An Occurrence with no Satisfying Feed by (its time + the Grace Window). Triggers a Missed Feed Alert to the whole household. **An internal term** — it names the condition in code, alerts and ADRs, and is never shown to a Member. What the app actually knows is that nobody tapped Log, and most of the time the pet was fed; a screen reading "Missed" tells a person their pet did not eat, which is the claim PRODUCT_BRIEF calls fatal. The label a Member reads is **Not Logged**.
_Avoid_: Skipped feed, overdue meal, and "Missed" as user-facing copy.

**Not Logged**:
The user-facing label for a Missed Feed — the Occurrence has no Satisfying Feed. It describes the record, not the animal, and it names its own remedy: not logged, so log it. Correcting one is ordinary, not an admission of neglect: a Member logs it whenever they remember, and the Occurrence is then genuinely satisfied.
_Avoid_: Missed, skipped, overdue, late.

## Notifications

**Alert**:
A notification queued for the Members of a Household — a Feed Logged Alert, a Missed Feed Alert, a Post, a Like Alert, or a change to who is in the Household. An Alert is recorded whether or not it is delivered — muting silences the push, not the record.

Every Alert is either **Household News** or **Addressed**, and that is what decides who sees it:

> The Inbox holds what is relevant to you: Household News, plus anything addressed to you
> personally. A Post is Household News — everyone is told. A Like, a comment, or an Invite is
> addressed to one person. Nobody hears about attention paid to someone else's Post.

**Household News**:
An Alert with no recipient. Every Member of the Household sees it — Posts, Missed Feed Alerts, removals and departures.

**Addressed Alert**:
An Alert with one named recipient. Only that person sees it — not the rest of the Household. Like Alerts and role changes are Addressed. Invites are meant to be, and that is the case being built towards: an invitee is not a Member yet, so nothing scoped to a Household can reach them.

**Inbox**:
The list of Alerts a Member can see, and the badge that counts the unread ones. Both are built from the same rule, so the badge can always be cleared by reading the list. It holds the **last seven days** — older Alerts are not shown, though nothing is deleted. See [ADR 0022](./docs/adr/0022-the-inbox-holds-the-last-seven-days.md). It leaves out Feed Logged Alerts, which have Activity and Home already; see [ADR 0023](./docs/adr/0023-feed-logs-are-delivered-but-not-listed.md).

**Feed Due Alert**:
The push that goes out shortly before a feed is due — "Crumpet's dinner is coming up". It reaches
every Member who has Feed Due Alerts on, each at their own Lead Time. One push covers every Pet in
the Household due at that moment, so a three-pet dinner is one notification and not three. It never
fires for an Occurrence that already has a Satisfying Feed, and it never fires once the feed time
has passed — a nudge that arrives late is worse than none. Like a Feed Logged Alert it is a push
only, and never reaches the Inbox. See
[ADR 0033](./docs/adr/0033-a-feed-due-alert-is-addressed-to-a-cohort.md).
_Avoid_: **Reminder** — that word belongs to a dated job on a Pet that is not a feed. Also due
alert, pre-alert, early warning.

**Lead Time**:
How long before a feed a Member wants their Feed Due Alert. Chosen per membership from 10, 15, 30
or 60 minutes, default 15. It is the Member's own setting, which is what makes it the opposite half
of the Grace Window: a Lead Time says when to nudge *before*, the Household's Grace Window says how
long to wait *after*.
_Avoid_: Warning time, offset, advance notice, reminder time.

**Feed Logged Alert**:
The immediate push when a Member logs a feed ("[Person] fed [Pet]"). It goes to every Member of the Household except the author, unless that Member has turned Feed Logged Alerts off. Role plays no part in who receives it. It is a push only — it never appears in the Inbox.

**Missed Feed Alert**:
The push to all household members when a Missed Feed is detected server-side, unless that Member has turned Missed Feed Alerts off. Nobody is excluded — there is no actor, because the point is that no one acted. The copy names the absent **log**, never the absent meal: "No one has logged Bailey's morning feed", not "Bailey hasn't been fed". The app only ever knows that nobody tapped Log, and most of the time the pet was fed — claiming otherwise is the trust failure PRODUCT_BRIEF calls fatal.

**Nudge Limit**:
After 3 consecutive Missed Feed Alerts for a pet with no Feed Log in between, Missed Feed Alerts stop for that pet until someone logs a feed. Stops a household that set up a schedule and drifted away from being nudged three times a day forever. Counted per pet, so one dormant pet never silences another.
_Avoid_: Snooze, cooldown, rate limit.

**Like Alert**:
The record that a Member liked another Member's Post. An Addressed Alert — the author sees it, nobody else does. It never pushes: a like is worth a line in a list, not an interruption. See [ADR 0021](./docs/adr/0021-a-like-is-a-record-not-an-interruption.md).

**Suppressed Alert**:
An Alert that was recorded but deliberately not delivered. Distinct from a failed delivery.

The lateness rule that used to produce these is **gone** (ADR 0029). A feed logged two hours late is that feed, logged late, and the household is told — the log names the Feed Time it satisfies, so lateness no longer makes it ambiguous. The column and the concept remain for a future reason to hold an Alert back; nothing sets one today.

**Double Feed**:
A second Feed Log against an Occurrence that already has a Satisfying Feed — two people logging the same feed. Because the Member names the Feed Time, this is now an exact fact rather than a guess, so the warning can name the collision: "Sarah logged Bailey's dinner at 6:05 pm." An Extra Feed is never a Double Feed, because it names no Feed Time. The app warns at log time and the Member decides whether to record it anyway.
_Avoid_: Duplicate feed, over-feed.

## Sharing

**Post**:
Photos a Member shares with their Household — a required title, an optional description, and
between one and ten images. Posts made before titles existed have none, and read fine without one.
Always
posted now: unlike a Feed Log, a Post carries no author-set time. Authored deliberately and
unrelated to feeding: a walk, a nap, a "she's fine, look at her". A Post is never a Feed Log and
never satisfies a Feed Time. See
[ADR 0017](./docs/adr/0017-household-scoped-posts-are-their-own-object.md).
_Avoid_: Update, moment, story, and above all **feed** — the word belongs to feeding, and calling a
Post surface "the feed" is what ADR 0017 exists to prevent.

**Post Detail**:
The screen holding one Post on its own — the same author, title, caption, Pet Tags, photos, likes
and likers the Posts tab shows, with neither the title nor the caption truncated. Where a Post or
Like notification lands, and where the title, the photo, the caption or the comment count on a Post opens. It holds the
Thread, so it is also where a Comment notification lands. Opening one Post does not mark the
Posts tab seen.
_Avoid_: Post page, permalink, single post view.

**Posts** (the tab):
The tab holding Posts, newest first — every Household the Member belongs to, together. Named for
what it holds. Visible only to Members. It is the one surface that does not follow the Active
Household: the switcher decides where a Member *acts*, and this tab decides what they *read*. Each
Post names the Household it came from, which is what keeps the two readable side by side.
_Avoid_: Household (that word means the group and nothing else), Feed, timeline, stream, news feed,
social, wall.

**Edited**:
The mark a Post carries once its author has changed the caption, the Pet Tags or the photos. Shown
beside the Post's time. Set by the database, and only when something actually changed — including a
reorder, since the order is part of what the Post shows. Editing belongs to the author alone — an
Owner may delete a Member's Post but never rewrite it. See
[ADR 0018](./docs/adr/0018-a-post-is-editable-by-its-author-alone.md) and
[ADR 0019](./docs/adr/0019-a-post-carries-up-to-ten-photos.md).
_Avoid_: Updated, modified, revised — and never call the marker a "version", there is no history.

**Pet Tag**:
An optional mark on a Post saying which Pets are in the photos. Several may be tagged, or none.
A tag describes the content; it never changes who can see the Post, which is always the whole
Household.
_Avoid_: Mention, subject, "posting to a pet".

**Like**:
A Member's single, reversible acknowledgement of a Post or a Comment. One per Member per thing,
counted and attributable. Never notifies anyone — a Like is not worth an interruption. It reaches
the inbox and stops there.
_Avoid_: Reaction (implies a set to choose from), favourite, heart, upvote.

**Comment**:
Something a Member writes under a Post, up to 500 characters. Its audience is the Post's audience,
which is the whole Household. Deletable by its author, by the Post's author and by an Owner; never
editable — delete and write it again. Unlike a Like, a Comment does notify: it is addressed to
someone and asks for an answer. See
[ADR 0031](./docs/adr/0031-comments-are-two-levels-deep.md).
_Avoid_: Note (that word belongs to a Feed Log), message, chat, thread (that is the whole set, not
one of them), caption (that belongs to the Post).

**Reply**:
A Comment that answers another Comment. It sits under the top-level Comment it belongs to, and
names the Member it answers with an "@" prefix. Replying to a Reply produces another Reply under
the same parent — the thread is two levels deep and never three.
_Avoid_: Nested comment, sub-comment, child, response.

**Thread**:
Every Comment on one Post, together, oldest first. Shown on Post Detail beneath the Post itself.
_Avoid_: Conversation, discussion, comment section.
