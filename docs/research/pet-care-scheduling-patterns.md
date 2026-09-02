# How other apps model recurring care

Research for the feeding-schedule rework. Every claim below carries a URL. Where a source is
marketing copy rather than documentation, it is labelled as such — App Store text says what a
product claims, not what its screens actually emphasise.

Crumpet's terms are used as [CONTEXT.md](../../CONTEXT.md) defines them. Where another product's
word collides with one of ours, that is called out.

**Date of research:** 18 August 2026.

---

## What I checked, and what I could not

**Verified first-party:** Apple's Health medications documentation, RFC 5545 (iCalendar), the
11pets site, the Nara Baby FAQ, the PawLog site, the Tody site, the Streaks site, and the App Store
listings for Fed?, Pawfolio, Did I Feed The Dog?, Pet Care Reminder & Tracker, and Done.

**Could not verify first-party, and so is either excluded or explicitly flagged:**

- **Huckleberry's help centre returns 403 to automated fetching.** The multi-caregiver claim below
  rests on search-engine extracts of its Zendesk articles, not on the pages themselves. Treat it as
  strong but unconfirmed.
- **Medisafe's help site returns 404** and its detailed behaviour (skip reasons, snooze, the red
  "Missed" state) is only documented on third-party review sites. **Unverified.** It is reported
  below because the vocabulary is distinctive, but do not treat it as fact.
- **Apple's Human Interface Guidelines are a JavaScript application** that serves no readable text
  to a fetcher. I could not get Apple's onboarding guidance in its own words. The onboarding section
  is therefore thinner than the rest, and says so.
- **I did not install or run any of these apps.** Everything about their UI comes from their own
  written descriptions.

**Checked and found irrelevant.** Four of the named candidates do not track recurring care at all:
[Barkio](https://barkio.com/en/) is a dog monitor and pet camera;
[Woofz](https://www.woofz.com/) is dog training;
[Pupford](https://pupford.com/pages/dog-training-app) is dog training;
Tably is a cat pain-assessment tool using photographs of the cat's face
([CBC](https://www.cbc.ca/news/canada/calgary/tably-calgary-alberta-artificial-intelligence-cats-1.7025398)).
Pawtrack is a GPS collar. None of them informs this rework.

---

## 1. Pet-care apps

### The direct competition is a crowded field, and it is newer than Crumpet's brief assumes

The "did anyone feed the dog" problem now has at least six shipping iOS apps aimed squarely at it.
All of them lead with the same sentence Crumpet's PRODUCT_BRIEF leads with.

- **Fed?** — "Mark meals as done, and everyone in your household sees the update instantly via
  iCloud." Free tier is 2 pets, 2 meals each, 1 family member, 7-day history.
  ([App Store](https://apps.apple.com/us/app/fed-pet-feeding-tracker/id6760776848))
- **Pawfolio** — "Everyone who helps look after your pet shares the same feeding log in real time",
  and it names double feeding as the problem it solves.
  ([App Store](https://apps.apple.com/us/app/pawfolio-pet-feeding-tracker/id6743056578))
- **Did I Feed The Dog?** — "open the app, see exactly who needs a meal, and log it with a single
  tap"; "Every meal log shows exactly which family member handled it."
  ([App Store](https://apps.apple.com/ph/app/did-i-feed-the-dog/id6764600152))
- **PawLog** — "Invite up to 6 caregivers, partner, kids, grandparents, dog sitter, on one shared
  log." ([pawlog.pet](https://www.pawlog.pet/))
- **Pawlo** — "the shared pet care app built for households with more than one person".
  ([App Store](https://apps.apple.com/us/app/pawlo-pet-care-tracker/id6762538892))
- **Pet Feeder** — "Family gets notified immediately when you feed or medicate your pet."
  ([petfeeder.app](https://petfeeder.app/))

This does not mean Crumpet is late. It means the coordination pitch is no longer the differentiator
it was when the brief was written, and the rework should be judged against what these apps do rather
than against nothing.

### Care types

Two shapes exist, and they are not the same product.

**Narrow and daily.** Fed? tracks meals and medication. Pet Feeder tracks "food, treats, and
medications". Did I Feed The Dog? tracks meals. These are habit apps with a pet on the front.

**Broad and occasional.** PawLog tracks "Potty breaks, Meals & water, Sleep & naps, Walks, Play,
Training, Vaccinations, Weight, Records & health" ([pawlog.pet](https://www.pawlog.pet/)). 11pets
tracks "Preventive care (deworming, vaccinations), Medical records, Hygiene care, Meal logging,
Medications, Vet visits, Behaviour monitoring, Measurements, Expenses tracking"
([11pets features](https://www.11pets.com/en/feature)). PetDesk sits at the far end — it is really a
veterinary practice's app, offering "care instructions and reminders for medications, exercise, and
more" plus appointment booking ([PetDesk](https://www.petdesk.com/pet-parents/)).

The distinction that matters: **the narrow apps model a recurring expectation, the broad apps model
a due date.** A meal recurs several times a day and its history is the point. A vaccination is due
once a year and only the next one matters. These are different data models wearing the same word
"reminder", and 11pets is the app that has both and reconciles them by treating everything as "the
next action is due" ([11pets features](https://www.11pets.com/en/feature)).

### How a schedule is expressed

Three patterns, and the good apps offer more than one.

**Fixed wall-clock times.** Pawfolio: "Set real meal times for each pet, like 8am and 6pm"
([App Store](https://apps.apple.com/us/app/pawfolio-pet-feeding-tracker/id6743056578)). This is
Crumpet's current model.

**Intervals.** The same Pawfolio sentence continues: "or keep it simple with an every-few-hours
schedule". This is a genuinely different model — the next expectation is computed from the last
event, not from the clock.

**Full calendar-style recurrence.** Pet Care Reminder & Tracker: "Schedule daily, weekly, monthly,
yearly, custom, and one-time care tasks"
([App Store](https://apps.apple.com/in/app/pet-care-reminder-tracker/id6444908248)).

Nothing in Crumpet's model can express "every second day" or "Tuesdays and Thursdays". A dog fed
twice daily does not need that. A cat on a fortnightly flea treatment does, and so does anything
beyond feeding.

### Multiple caregivers

Real sharing exists in this category and the mechanics vary in one way that matters — **how hard it
is for the second person to join.**

- **PawLog** uses an invite link and says "No install required to join" — the invitee opens it in a
  browser ([pawlog.pet](https://www.pawlog.pet/)). This is the lowest-friction model found in any
  app surveyed.
- **Fed?** and **Did I Feed The Dog?** use iCloud sync, so joining is an Apple-family operation and
  there is no separate account
  ([Fed?](https://apps.apple.com/us/app/fed-pet-feeding-tracker/id6760776848),
  [Did I Feed The Dog?](https://apps.apple.com/ph/app/did-i-feed-the-dog/id6764600152)).
- **11pets** uses per-item permissions: "fine-grained data sharing technology where you can select
  which data you want to share, of which pet, with who and for how long", and separately allows
  inviting a vet to enter data ([11pets](https://www.11pets.com/en/home)).
- **Pet Care Reminder & Tracker** has "Shared Households: Invite family members or pet sitters" and
  "Household Notifications: Get notified when household members complete reminders"
  ([App Store](https://apps.apple.com/in/app/pet-care-reminder-tracker/id6444908248)) — the same
  design as Crumpet's Feed Logged Alert.

Only 11pets has anything resembling roles. Everyone else gives every caregiver the same powers.
That is worth noticing, because Crumpet has built an Owner/Contributor split that no competitor
considered necessary.

### Adding a pet

**No first-party source states what the pet-creation form asks for.** App Store screenshots would
show it and I did not inspect them.

One first-party data point exists, and it is a good one. Pawfolio's release notes say: "Smoother
onboarding: tell us when your pet last ate and your countdown starts straight away"
([App Store](https://apps.apple.com/us/app/pawfolio-pet-feeding-tracker/id6743056578)). They shipped
a change that replaced schedule setup with a single question — _when did the pet last eat_ — and got
a working app out of it immediately. The schedule can come later; the countdown cannot.

---

## 2. Adjacent domains

### Baby tracking — the closest analogue, and its leader has no sharing model at all

**Huckleberry is the market leader and does not support multiple accounts.** Its help centre tells
caregivers to sign in to the same account on each phone, with the caveat that "both caregivers must
be connected to the internet in order to synchronize across devices". A separate article explains
that a user who signed up with Apple ID must first add an email address before they can share.
(Extracts from `huckleberry.zendesk.com` articles
[360062801213](https://huckleberry.zendesk.com/hc/en-us/articles/360062801213-How-do-I-share-my-account-with-my-husband-wife-partner-or-another-caregiver),
[360025562694](https://huckleberry.zendesk.com/hc/en-us/articles/360025562694-Can-another-caregiver-track-sleep-for-the-same-child)
and
[4409238573075](https://huckleberry.zendesk.com/hc/en-us/articles/4409238573075-I-signed-up-for-Huckleberry-with-my-AppleID-How-can-I-share-with-my-partner).
**The pages themselves return 403 to a fetcher; this is unverified at first hand.** The App Store
listing does say "Sync with multiple caregivers across devices"
([App Store](https://apps.apple.com/us/app/huckleberry-baby-child/id1169136078)), which is
consistent with shared credentials.)

Huckleberry has no "who did it" attribution because there is nobody to attribute to. Crumpet's
`logged_by` is a real advantage over the biggest app in the nearest category.

**Nara Baby does have a proper invite model**, and it is flat: "Send them an invite from the
'Family' tab, and they'll receive an email prompting them to create an account", after which "they
have 100% full access in the app the same way that you do"
([Nara FAQ](https://nara.com/pages/nara-baby-tracker-faq)).

**Nara's two schedule modes are the most transferable idea in this document.** From the same FAQ:
reminders run on either **Fixed Times** ("specific times regardless of nap timing") or **Wake
Windows** ("adjusted based on when the child woke from the previous nap"). One is clock-anchored,
the other is event-anchored, and the user picks per child. This is precisely the fixed-times versus
intervals split Pawfolio offers, arrived at independently.

**Huckleberry sells the schedule, not the log.** Tracking, timers, feeding logs and reminders are
free; the "Schedule Creator", SweetSpot predictions and insights are paid
([Huckleberry Free](https://huckleberrycare.com/product/free)). The recurring expectation is the
premium object. The record of what happened is the free one.

### Medication adherence — Apple has already solved Crumpet's exact naming problem

Apple's Health app documentation is the single most useful source found, because Apple faced the
same trust problem and answered it in the copy.

From [Apple Support 105064](https://support.apple.com/en-us/105064):

- The two states are **Taken** and **Skipped**. On Apple Watch the button reads **Log as Taken**.
- Medications without a schedule are **As Needed**, and are logged rather than confirmed. This is
  exactly Crumpet's **Extra Feed**.
- Schedule types include **On a Cyclical Schedule** and **On Specific Days of the Week**. A
  medication whose schedule the device cannot render shows **Schedule Unavailable**.
- Reminders are **Dose Reminders**, and there is a second tier: "You can also turn on follow up
  reminders which will alert you if you **haven't logged** a medication 30 minutes after the initial
  notification." _(emphasis added)_
- A medication you have stopped is **Archived**, not deleted: "Archive a medication to keep the
  medication details and log history for your records. Delete a medication to remove all information
  and history."

Three things follow.

**Apple says "haven't logged", not "haven't taken".** This is Crumpet's **Not Logged** decision,
made by Apple, in a health context where the stakes are higher. The reasoning in CONTEXT.md is
independently confirmed by the most conservative copy team in the industry.

**Apple's tolerance window is 30 minutes, one-sided, and is a notification delay rather than a
matching rule.** It only decides when to nudge. It does not decide whether a dose "counts". Crumpet's
Grace Window does both jobs at once, which is why it has to be symmetric and why it produces the
awkward Extra Feed category.

**Archive versus delete is a distinction Crumpet does not have.** Removing a Scheduled Time from a
Feeding Schedule today changes what history means, because history is derived from the current
schedule.

**Medisafe — unverified.** Third-party write-ups describe a richer state machine: a dose can be
taken, skipped with a mandatory reason, snoozed, or rescheduled, and a passed dose shows the word
"Missed" in red ([Tech-enhanced Life](https://www.techenhancedlife.com/citizen-research/how-use-medisafe-app),
[manuals.plus](https://manuals.plus/medisafe/mum-0100-00-pill-and-med-reminder-manual)). Medisafe's
own help site is 404 and I could not confirm any of it. What _is_ first-party is the **Medfriend**
feature: a family member or caregiver who receives a push when the patient misses doses
([Medisafe](https://medisafe.com/education-resources/the-impact-of-medisafes-medfriend-caregiver-feature-on-adherence)).
That is Crumpet's Missed Feed Alert, in a different domain, with a name.

**MyTherapy** states that it "automatically documents every intake, whether taken or skipped", and
that notes can be attached to each instance ([MyTherapy](https://www.mytherapyapp.com/)). The word
for the recorded occurrence is **intake**.

### Household chores — assignment, rotation, and a refusal to use dates

**Tody's whole design is an argument against scheduling.** Its Google Play description says the app
lets you "gain flexibility by managing cleaning tasks by indicators of actual need rather than
arbitrary dates", and that "There are no deadlines, alarms and notifications (optional)"
([Google Play](https://play.google.com/store/apps/details?id=com.looploop.tody)). Its own site adds
that "tasks in Tody aren't rigidly fixed to specific days; instead, your to-do lists adapt and evolve
over time", and that the app tracks each task's **"dueness"** ([todyapp.com](https://todyapp.com/)).
For households it offers "data synchronization, participant assignments and an automated rotation
scheme".

"Dueness" as a continuous quantity rather than a boolean is a real idea. Tody sorts by how overdue
something is instead of declaring it failed.

**Sweepy** distributes work: it generates a daily schedule per member, and members compete on a
family leaderboard ([sweepy.com](https://sweepy.com/)). Multiple users are the paid tier
([App Store](https://apps.apple.com/us/app/sweepy-home-cleaning-schedule/id1498897320)) — the same
monetisation line Crumpet is considering.

**Flatastic** uses a "Cleaning Schedule" and a score system that "keeps everyone accountable"
([flatastic-app.com](https://flatastic-app.com/en/)). No calendar is mentioned.

Assignment and rotation are the one capability every chore app has and no pet app surveyed has.
Crumpet has no concept of _whose turn it is_.

### Habit apps — how to present a recurring expectation without shaming

**Streaks** is built on the opposite premise: "Every day you complete a task, your streak is
extended… Don't break the chain, or your streak will reset to zero days"
([streaksapp.com](https://streaksapp.com/)). Its recurrence vocabulary is worth copying even if its
psychology is not — its own examples are "Monday to Friday", "3 days per week", "every Wednesday",
and "Sunday to Friday".

**Done** takes the position Crumpet needs. Its App Store listing promises "no streak pressure, no
guilt", allows a habit to be scheduled as "3 times a week, any days", and replaces the streak with a
**recovery rate** and a **consistency score**. Its notifications carry three actions: **snooze, skip
and complete** ([App Store](https://apps.apple.com/us/app/done-habit-tracker/id6757984661)).

"3 times a week, any days" is the shape of a real feeding requirement that Crumpet cannot express
and arguably should not try to. But **recovery rate** — how quickly you get back on track after a
gap — is a far kinder headline number than a streak, and directly serves a product whose stated
failure mode is a household that feels judged.

---

## 3. Vocabulary

Every row is a word a shipping product uses. The user-facing/internal split is only marked where the
source is explicit about it.

### (a) The expected occurrence of a recurring thing

| Word                                             | Product                             | User-facing? | Source                                                                              |
| ------------------------------------------------ | ----------------------------------- | ------------ | ----------------------------------------------------------------------------------- |
| **Dose** ("Dose Reminders")                      | Apple Health                        | Yes          | [support.apple.com/105064](https://support.apple.com/en-us/105064)                  |
| **Meal**                                         | Fed?, Pawfolio, Did I Feed The Dog? | Yes          | [Fed?](https://apps.apple.com/us/app/fed-pet-feeding-tracker/id6760776848)          |
| **Feeding time** / **meal time**                 | Fed?, Pawfolio                      | Yes          | [Pawfolio](https://apps.apple.com/us/app/pawfolio-pet-feeding-tracker/id6743056578) |
| **Care task**                                    | Pet Care Reminder & Tracker         | Yes          | [App Store](https://apps.apple.com/in/app/pet-care-reminder-tracker/id6444908248)   |
| **Up Next** (the imminent one)                   | Pet Care Reminder & Tracker         | Yes          | same                                                                                |
| **Next action** (as in "the next action is due") | 11pets                              | Yes          | [11pets features](https://www.11pets.com/en/feature)                                |
| **Recurrence instance**                          | RFC 5545                            | No — spec    | [RFC 5545 §3.8.5.2](https://www.rfc-editor.org/rfc/rfc5545.html)                    |
| **Occurrence**                                   | RFC 5545                            | No — spec    | same                                                                                |

### (b) The record that it happened

| Word                                                  | Product                  | User-facing? | Source                                                                          |
| ----------------------------------------------------- | ------------------------ | ------------ | ------------------------------------------------------------------------------- |
| **Taken** / **Log as Taken**                          | Apple Health             | Yes          | [support.apple.com/105064](https://support.apple.com/en-us/105064)              |
| **Intake**                                            | MyTherapy                | Yes          | [mytherapyapp.com](https://www.mytherapyapp.com/)                               |
| **Done** ("Mark meals as done")                       | Fed?                     | Yes          | [App Store](https://apps.apple.com/us/app/fed-pet-feeding-tracker/id6760776848) |
| **Complete** (notification action)                    | Done                     | Yes          | [App Store](https://apps.apple.com/us/app/done-habit-tracker/id6757984661)      |
| **Log** / **log entry**                               | PawLog, Pet Feeder, Nara | Yes          | [pawlog.pet](https://www.pawlog.pet/)                                           |
| **COMPLETED** (status), **COMPLETED** (the timestamp) | RFC 5545 VTODO           | No — spec    | [RFC 5545 §3.8.1.11](https://www.rfc-editor.org/rfc/rfc5545.html)               |

### (c) The state where it did not happen

| Word                                          | Product                                     | User-facing? | Source                                                                                                        |
| --------------------------------------------- | ------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| **Skipped**                                   | Apple Health                                | Yes          | [support.apple.com/105064](https://support.apple.com/en-us/105064)                                            |
| **Overdue**                                   | Fed?, Did I Feed The Dog? ("red = overdue") | Yes          | [Did I Feed The Dog?](https://apps.apple.com/ph/app/did-i-feed-the-dog/id6764600152)                          |
| **Catch Up** (the section holding them)       | Pet Care Reminder & Tracker                 | Yes          | [App Store](https://apps.apple.com/in/app/pet-care-reminder-tracker/id6444908248)                             |
| **Missed days**                               | Fed?                                        | Yes          | [App Store](https://apps.apple.com/us/app/fed-pet-feeding-tracker/id6760776848)                               |
| **Missed** (red)                              | Medisafe                                    | Yes          | **Unverified** — [Tech-enhanced Life](https://www.techenhancedlife.com/citizen-research/how-use-medisafe-app) |
| **NEEDS-ACTION**                              | RFC 5545 VTODO status                       | No — spec    | [RFC 5545 §3.8.1.11](https://www.rfc-editor.org/rfc/rfc5545.html)                                             |
| **Recovery rate** (the metric, not the state) | Done                                        | Yes          | [App Store](https://apps.apple.com/us/app/done-habit-tracker/id6757984661)                                    |
| **Dueness** (a continuous quantity)           | Tody                                        | Yes          | [todyapp.com](https://todyapp.com/)                                                                           |

### (d) The tolerance window around a due time

**Nobody surveyed has a user-facing name for this.** That is the single clearest finding in the
vocabulary section. Crumpet's "Grace Window" is a concept the category avoids exposing.

What exists instead:

| Mechanism                                                                                                      | Product      | Source                                                                     |
| -------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------- |
| **Follow up reminders** — fires "if you haven't logged a medication 30 minutes after the initial notification" | Apple Health | [support.apple.com/105064](https://support.apple.com/en-us/105064)         |
| **Remind Me in 10 Minutes** (notification action on Apple Watch)                                               | Apple Health | same                                                                       |
| **Snooze** (notification action)                                                                               | Done         | [App Store](https://apps.apple.com/us/app/done-habit-tracker/id6757984661) |
| No tolerance at all — a log is just a timestamped entry                                                        | PawLog       | [pawlog.pet](https://www.pawlog.pet/)                                      |

Apple's window is one-sided and delays a notification. It never decides whether a dose counted,
because a dose only counts when you tap Taken. Crumpet's Grace Window does something harder — it
matches an arbitrary timestamp back to an expectation — and that extra job is where the Extra Feed
and Double Feed complications come from.

### Words to avoid, on this evidence

**"Meal"** is what every competitor calls it, which is both an argument for and against.
CONTEXT.md already bans it. Note that the ban now costs something: it is the term users arrive with.

**"Slot"** appears in no product surveyed, user-facing or otherwise. The nearest real-world uses are
Apple's "dose" and RFC 5545's "occurrence". **Occurrence** is the standards term for exactly the
thing Crumpet means and carries no empty-container connotation.

---

## 4. Does a calendar earn its place?

**The honest answer is that the evidence is mixed and mostly circumstantial, but it leans no.**

### What the evidence actually shows

**The apps closest to Crumpet's problem have no calendar.**

- PawLog's surfaces are a "daily dashboard" showing "Today's care at a glance" and a "7-day
  timeline". No calendar of any kind ([pawlog.pet](https://www.pawlog.pet/)).
- Did I Feed The Dog? leads with a colour-coded dashboard: "green = fed, red = overdue"
  ([App Store](https://apps.apple.com/ph/app/did-i-feed-the-dog/id6764600152)).
- Fed? leads with a widget and one-tap logging
  ([App Store](https://apps.apple.com/us/app/fed-pet-feeding-tracker/id6760776848)).
- Huckleberry's App Store listing describes tracking, reports and predictions, and mentions no
  calendar ([App Store](https://apps.apple.com/us/app/huckleberry-baby-child/id1169136078)).
- Nara's FAQ mentions no calendar view
  ([Nara FAQ](https://nara.com/pages/nara-baby-tracker-faq)).

**The apps furthest from it do have one.** Pet Care Reminder & Tracker added an "Expanding Calendar:
Navigate between months with a swipe"
([App Store](https://apps.apple.com/in/app/pet-care-reminder-tracker/id6444908248)). PetnotePlus
offers "a calendar and schedule view where you can see all records, diaries, and expenses in a
single calendar" ([App Store](https://apps.apple.com/us/app/petnote-pet-care-tracker/id1553584485)).
Both are broad pet managers covering vet visits, expenses and diaries — the class of care where the
next occurrence is months away and a date is the only thing that identifies it.

**11pets, the most feature-complete pet manager surveyed, did not build a calendar. It integrates
with the device's.** Its site describes keeping the pet-care schedule synchronised with the
calendars already on the phone. _(This is a search-engine extract of `11pets.com`; the specific
sentence is not on the two pages I fetched directly —
[home](https://www.11pets.com/en/home) and [features](https://www.11pets.com/en/feature) — so treat
the calendar-sync detail as **unverified**. What I did verify on the features page is the framing:
"The application will maintain an automatic schedule and will remind you when the next action is
due.")_

**Where a grid does appear in a feeding app, it is a heatmap, not a calendar.** Pawfolio's "Feeding
Patterns" turns "the last 8 weeks into a colour-coded grid" so you can "spot trends in seconds,
build a consistency streak, and see exactly where the routine tends to slip"
([App Store](https://apps.apple.com/us/app/pawfolio-pet-feeding-tracker/id6743056578)). That answers
"are we consistent", which a month grid answers badly.

### The structural argument, which is stronger than the survey

RFC 5545 splits recurring things into two component types, and the split is exactly the one Crumpet
faces.

A **VEVENT** is something that happens on a calendar. It has a start and an end. **It has no concept
of completion** — there is no way to say an event did or did not occur.

A **VTODO** is something expected to be done. It has **DUE**, "the date and time that a to-do is
expected to be completed"; **COMPLETED**, the time it actually was; and **STATUS**, one of
`NEEDS-ACTION`, `COMPLETED`, `IN-PROCESS` or `CANCELLED`
([RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html)).

**A Scheduled Time is a VTODO, not a VEVENT.** A calendar UI is the presentation layer for VEVENTs —
it shows blocks of intent against time. It has no native way to draw "this was expected and nobody
recorded it", which is the only fact Crumpet's Home screen exists to communicate. Any calendar view
Crumpet builds has to invent that language itself, at which point the grid is carrying no weight.

### Where the evidence is thin

I found **no first-party writing by any of these companies about why they did or did not build a
calendar.** Nobody publishes that. The pattern above is inferred from what shipped, not from anyone
saying why. A month grid may well be present in apps whose App Store copy does not mention it, since
listings advertise differentiators rather than furniture.

**One thing the survey cannot tell you at all:** whether users ask for a calendar. Absence from
competitor marketing is not absence of demand.

---

## 5. Onboarding

This section is the weakest, and I would rather say so than pad it.

**No first-party design guidance was obtainable.** Apple's Human Interface Guidelines onboarding
page is a JavaScript application that serves no text to a fetcher, and I could not retrieve Apple's
wording. There is no first-party public writing from any surveyed app about setup drop-off.

**What is verifiable is one shipped change, and it points one way.** Pawfolio's release notes read:
"Smoother onboarding: tell us when your pet last ate and your countdown starts straight away"
([App Store](https://apps.apple.com/us/app/pawfolio-pet-feeding-tracker/id6743056578)). The new
first question is not the schedule. It is a single fact about the past that makes the main screen
work immediately.

**The second data point is Huckleberry's pricing.** Logging, timers and reminders are free; the
"Schedule Creator" is paid ([Huckleberry Free](https://huckleberrycare.com/product/free)). A feature
behind a paywall is definitionally not in the signup flow. Huckleberry's users log for weeks before
they ever build a schedule.

**The third is PawLog's join flow.** "No install required to join" — an invited caregiver opens a
link in a browser ([pawlog.pet](https://www.pawlog.pet/)). PRODUCT_BRIEF names invite friction as a
risk that could sink the multi-member model. A competitor has removed the install step entirely.

Beyond these three, I cannot tell you what any of these apps ask for when you add a pet. Determining
that means installing them.

---

## What this suggests for Crumpet

Everything below is **my inference**, not a cited finding. Each rests on evidence above; none of it
is anyone's stated position.

**1. Rename the slot to an Occurrence, and make it a first-class row.** "Occurrence" is the
standards word for exactly this thing (RFC 5545) and carries none of "slot"'s empty-container
baggage. More importantly, deriving it at read time is what makes the model fragile. Store one row
per expected occurrence per day, per RFC 5545's own pattern: the schedule generates the recurrence
set, and a materialised row exists only where something differs from the rule — a log attached, or a
skip, or a one-off change. This is how `RECURRENCE-ID` works and it is the reason calendars can
answer "what happened on the 3rd" without recomputing history from today's schedule. Crumpet cannot
answer that question at all right now.

**2. Split the Grace Window into two things, because it is currently doing two jobs badly.** Apple's
30-minute follow-up window only delays a nudge; it never decides whether a dose counted, because a
dose counts when the user says it does. Crumpet's window also has to guess which Scheduled Time an
arbitrary timestamp belongs to, and every awkward corner of the model — Extra Feed, Double Feed, the
symmetry requirement — is downstream of that guess. Let a member attach a log to an occurrence
explicitly when it matters, keep the window purely for _when to send the nudge_, and both concepts
collapse.

**3. Support event-anchored schedules, not just clock-anchored ones.** Nara offers Fixed Times or
Wake Windows; Pawfolio offers real meal times or "every-few-hours". Two products in different
categories arrived at the same split. Interval scheduling also gives Crumpet a countdown — "next
feed in 2h 40m" — which is a far better Home screen than a list of times, and which Pawfolio ships
on the Lock Screen and Dynamic Island.

**4. Do not build a calendar. Build a heatmap and a per-pet Activity, both of which you nearly
have.** Pawfolio's 8-week consistency grid answers the question a month view pretends to. It is also
a small feature, it is a natural paid tier, and it does not require inventing a visual language for
"expected but not logged" inside a grid built to show events. If the calendar question comes back
later, it will come back as vet appointments and medication courses — a genuinely date-shaped
problem — and it should be built then, for that, not now for feeding.

**5. Copy Apple's Archive/Delete split before it becomes a data bug.** Removing a Scheduled Time
today silently changes what past days mean, because the past is derived from the present schedule.
Apple keeps a stopped medication's "details and log history" under Archive and reserves Delete for
things added in error. Crumpet needs the same distinction, and needs it before anyone has enough
history to notice.

**6. If the app is pet management rather than feeding, the missing concept is not a calendar — it is
assignment.** Every chore app has it (Tody's "automated rotation scheme", Sweepy's per-member daily
schedule); no pet app surveyed does. Crumpet already models Members with roles, which is more
structure than any competitor built. "Whose turn is the evening feed" is a coordination question
that a household actually asks, it is unserved in this category, and it is a far more defensible
second feature than a month grid.

**And one thing that contradicts the framing.** The brief treats the coordination pitch as the
differentiator. It is not one any more — at least six iOS apps now lead with the same sentence, and
PawLog will let a dog sitter join from a browser without installing anything. What Crumpet has that
they do not is roles, server-side missed-feed detection, and unusually careful language about what
the app does and does not know. That is the defensible ground. The redesign should widen it rather
than chase feature parity.
