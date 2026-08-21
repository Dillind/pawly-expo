# Modelling a recurring care schedule in Postgres

Research for a ground-up redesign of Crumpet's Feeding Schedule. The question: how do you model a
recurring care schedule so that it supports varied recurrence, survives being edited, and can be
matched against what actually happened?

Everything above the final section is cited. The final section, **Recommended shape for Crumpet**,
is my recommendation and is marked as such.

## Where Crumpet is today

`feeding_schedules(pet_id, scheduled_time time, label enum, created_at)`. A wall-clock time, the
same every day, forever. `feed_logs(pet_id, logged_by, logged_at, notes)`. One
`grace_window_minutes` per household. The link between a log and the time it satisfied is not
stored — `private.slot_states` derives it at read time with a greedy nearest-match inside the Grace
Window ([ADR 0009](../adr/0009-symmetric-grace-window-derived-slot-matching.md)).

Three things in the current migrations are worth naming before the research, because each is a
symptom of a missing concept:

- **Editing a schedule rewrites the past.** ADR 0009 accepts this explicitly.
- **`20260801090000_slot_states_new_slots_start_tomorrow.sql`** filters slots by
  `created_at::date < target_date`. That is a validity range with one end and no name.
- **The alert idempotency key is `(kind, subject_id, subject_date)`** where `subject_id` is the
  `feeding_schedules.id`. It assumes a schedule row's identity is stable for the life of the pet.

---

## 1. Recurrence rules

### What RFC 5545 actually says

The de facto standard is the `RRULE` property of iCalendar,
[RFC 5545 §3.8.5.3](https://www.rfc-editor.org/rfc/rfc5545.html). Its shape:

- **`FREQ`** is required and appears once — `SECONDLY` through `YEARLY`.
- **`INTERVAL`** is "a positive integer representing at which intervals the recurrence rule repeats.
  The default value is '1'."
- **`UNTIL`** "defines a DATE or DATE-TIME value that bounds the recurrence rule in an inclusive
  manner", and must match the value type of `DTSTART`.
- **`COUNT`** bounds by number of occurrences. `UNTIL` and `COUNT` "MUST NOT occur in the same
  'recur'".
- **`BYDAY`, `BYMONTHDAY`, `BYSETPOS`** and the rest are *expanders* or *limiters* depending on
  which `FREQ` they sit under. `BYSETPOS` selects from the set the other `BYxxx` parts generated —
  `-2` is the second-to-last occurrence in each period.

Three sentences in that section matter more than the grammar
([mirror of §3.8.5.3](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html)):

1. **The recurrence set is a computed thing, not a stored one.** It is "the complete set of
   recurrence instances for a calendar component", generated from `DTSTART` plus `RRULE` plus
   `RDATE`, minus `EXDATE`, with duplicates ignored.
2. **`DTSTART` is part of the rule.** "The recurrence set is undefined" if `DTSTART` does not
   synchronise with the rule's parameters. You cannot store an `RRULE` without also storing the
   anchor it hangs off.
3. **A rule with neither `COUNT` nor `UNTIL` generates instances forever.** There is no natural
   bound to iterate to.

Invalid dates are simply **ignored** — 30 February produces nothing, silently.

### RFC 7529, and why "ignored" was not good enough

[RFC 7529](https://www.rfc-editor.org/rfc/rfc7529.html) adds `RSCALE` (non-Gregorian calendars) and
`SKIP`. `SKIP` exists because RFC 5545's "ignore invalid dates" rule produces bad behaviour: someone
born on 29 February gets a yearly birthday event only every four years. `SKIP` takes `OMIT` (the
default, matching RFC 5545), `BACKWARD` or `FORWARD`. The RFC notes that humans expect a missing
occurrence to shift to a nearby valid date rather than vanish, and that which direction they expect
varies by calendar system.

That is the whole problem with RRULE in one example. The grammar is expressive; the *semantics of
the edge cases* are where users and implementers disagree.

### What practitioners say

The strongest primary source is the IETF CalConnect working group's own draft,
[Support for Series in iCalendar](https://datatracker.ietf.org/doc/html/draft-ietf-calext-icalendar-series-03).
It exists because RFC 5545 recurrence is hard to live with, and it says so:

- "The master plus overrides is considered a single resource in most circumstances."
- "The RFC5545 THISANDFUTURE range is poorly supported. Splitting is the approach a number of
  implementations use to avoid changing overrides in the past."
- "Changing the master start or the recurrence rules … can lead to some very difficult problems to
  resolve. In the case of a heavily modified meeting it may be difficult to impossible to determine
  which override applies to the newly modified event."
- On splitting a series in two: "There is left the problem of relating the two … this can be
  accomplished by use of the RELATED-TO property but that is not standardized."
- "If a long lived recurrence is heavily overridden it becomes very cumbersome."

Nylas, who sell a calendar API and therefore have to reconcile every provider's interpretation,
report the same from the implementer's side
([The Deceptively Complex World of Calendar Events and RRULEs](https://www.nylas.com/blog/calendar-events-rrules/)):

- On exceptions: cancel the original with `EXDATE` and create a replacement, and "it looks like the
  parent isn't repeating on that specific day, but it actually still is! If we delete or change the
  parent event, the modified exception event will stick around regardless."
- Providers disagree with the spec. "The Google Calendar API does not update the EXDATE field when
  an event is cancelled" — it returns cancelled instances as separate objects instead. Exchange uses
  a different format entirely.
- On querying: "A seemingly-simple query like 'get all events on my calendar between these times'
  is substantially harder to write."

### RRULE string in a column, versus explicit columns

There is no neutral authority on this, so here is the honest split.

**For an RRULE string.** It is a standard, so import and export are free, and every platform has a
library that can expand it. It is one column. It expresses things columns cannot: "the last weekday
of the month", "every second Tuesday".

**Against.** It is opaque to the database. Postgres cannot expand an RRULE — there is no core
function and no standard extension — so "what is due today" cannot be answered in SQL. You either
push expansion to application code or write an expander in PL/pgSQL. RFC 5545 also forbids querying
what you stored: you cannot ask "which schedules run on Tuesdays" with an index, because the answer
depends on `DTSTART`, `BYDAY`, `BYSETPOS` and `INTERVAL` interacting.

The practical middle ground that large calendar systems actually ship is **structured columns, not a
string**. Microsoft Graph models recurrence as a
[`patternedRecurrence`](https://learn.microsoft.com/en-us/graph/api/resources/event) object — a
pattern plus a range — rather than an RRULE. Google Calendar accepts RRULE lines but exposes
instances through a separate endpoint. FHIR, which had every opportunity to reuse RRULE, invented
its own [`Timing`](https://build.fhir.org/datatypes.html#Timing) datatype instead: `event` for
explicit times, and `repeat` with `bounds[x]`, `count`, `frequency`, `period`, `dayOfWeek`,
`timeOfDay`, `when` and `offset`.

The reading I take from that: **RRULE is the right interchange format and a poor storage format.**
Store what you can query, and generate an RRULE string at the boundary if anyone ever needs one.

---

## 2. Materialising occurrences versus computing them

This is the fork. Generate a row per expected occurrence, or compute occurrences from a rule on
demand.

### The case for computing

[Martin Fowler's *Recurring Events for Calendars*](https://martinfowler.com/apsupp/recurring.pdf)
is the canonical argument. His **Temporal Expression** is an object that answers one question: does
this event occur on a given date? The point is that you never enumerate. Expressions compose with
set operations — union for "or", intersection for "and", **difference for exceptions** — so
"every Tuesday except public holidays" is a composition, not a special case. An unbounded rule is
representable because nothing is ever expanded.

The standards agree by construction. CalDAV requires the *server* to expand on read, not on write:
"The server MUST expand recurring components to determine whether any recurrence instances overlap
the specified time range" ([RFC 4791](https://www.rfc-editor.org/rfc/rfc4791.html)). And it forbids
splitting a series across resources: "Calendar components with the same UID property value, in a
given calendar collection, MUST be contained in the same calendar object resource" — the RFC's
stated reason is that this "avoids problems of limiting how many recurrence instances to store in
the repository".

That last clause is the killer argument against materialising. There is no correct horizon. Any
number you pick is wrong for someone.

### The case for materialising

The counter-argument is entirely about read performance and queryability. From the pgsql-general
list, [Craig Ringer on recurring events](https://www.postgresql.org/message-id/4DED5A8F.6020204@postnewspapers.com.au):

- Two tables — the rule, and a materialised table of instances maintained by `SECURITY DEFINER`
  triggers on the rule table. Make the materialised table read-only to the application. Index only a
  bounded window (his example: three years back, three years forward).
- On-the-fly `generate_series` is "more efficient for narrow date ranges or single days/weeks" but
  "performs poorly when generating results for wide date ranges".
- He also recommends `'infinity'` over `NULL` for an open-ended end, because `NULL` forces `CASE`
  expressions through every query.

That last point is small and immediately useful.

### What the big systems actually do

Both major calendar APIs are hybrids that keep the rule as the source of truth and expand for reads:

- **Microsoft Graph.** Listing `/events` "contains single instance meetings and series masters".
  Getting expanded occurrences requires a *different* endpoint,
  [`calendarView`](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview), which
  takes a mandatory `startDateTime` and `endDateTime` and returns "the occurrences, exceptions and
  single instances of events in a calendar view defined by a time range". Expansion is bounded by
  the caller's window, by design.
- **Google Calendar.** "A recurring event consists of several *instances*: its particular
  occurrences at different times. These instances act as events themselves." Instances come from
  [`events.instances`](https://developers.google.com/workspace/calendar/api/v3/reference/events/instances),
  bounded by `timeMin`/`timeMax` and capped at 2500 results.

Neither exposes an unbounded expansion. Both make the caller name a window.

### Where I think the balance sits

The trade-offs, honestly:

| | Compute | Materialise |
|---|---|---|
| Storage | One row per rule | One row per occurrence, forever, per pet |
| "What is due today?" | A function call | An indexed lookup |
| Unbounded rules | Free | Impossible; needs a horizon and a backfill job |
| "Skip Tuesday" | A difference/exception row | Delete or flag a row |
| Rule change | Instant, one row | O(n) rewrite of every future row |
| Drift risk | None — one source of truth | Rows can disagree with the rule |
| History stability | Past changes when the rule changes | Past is frozen by construction |

The last row is the only genuine argument for materialising, and it is a real one. But it solves the
history problem *by accident*, and it introduces a class of bug — materialised rows silently out of
step with their rule — that is much harder to notice than the problem it fixes. Section 3 gets the
same frozen history with none of the rows.

Where practice is genuinely contested: for calendar-scale systems (arbitrary users, arbitrary date
ranges, sync protocols), the hybrid is the settled answer. For small, bounded, "what is due today"
workloads, I could find no credible source arguing for materialisation on its merits — only on
performance grounds that do not apply below a few thousand rows.

---

## 3. Editing without corrupting history

### How iCalendar does it

Three mechanisms, all in RFC 5545:

- **`EXDATE`** (§3.8.5.1) removes dates from the recurrence set.
- **`RDATE`** (§3.8.5.2) adds them.
- **`RECURRENCE-ID`** (§3.8.4.4) overrides one instance. It "is used in conjunction with the UID and
  SEQUENCE properties to identify a specific instance of a recurring VEVENT, VTODO, or VJOURNAL",
  and — the load-bearing detail — **"the property value is the original value of the DTSTART property
  of the recurrence instance"**. The *original* time is the key. Move the instance and the key does
  not move with it. ([§3.8.4.4](https://icalendar.org/iCalendar-RFC-5545/3-8-4-4-recurrence-id.html))

For "this and all future", RFC 5545 offers the `RANGE=THISANDFUTURE` parameter: "a range defined by
the given recurrence instance and all subsequent instances". As quoted in section 1, the CalConnect
draft says plainly that this "is poorly supported" and that implementations split the series
instead — truncate the original with `UNTIL`, create a new one — accepting that the standard gives
them no way to relate the two halves.

**So the calendar world's own answer to "this and all future" is: end the old rule, start a new
one.** That is effective dating, arrived at from the other direction.

### Effective dating in SQL

Fowler's temporal patterns call the single-dimension version **Effectivity**: a row carries the
period over which it is true. Two clocks exist in general
([Bitemporal History](https://martinfowler.com/articles/bitemporal-history.html)):

- **Actual time** (valid time) — "the actual history … what history should be given perfect
  transmission of information".
- **Record time** (transaction time) — how our knowledge of that history changed.

His advice on whether you need both is unambiguous: **"If we can avoid using bitemporal history,
then that's usually preferable as it does complicate a system quite significantly."** Use it only
"when we have to deal with discrepancies between actual and record history, usually due to
retroactive updates". He also names the escape hatch: if you rule that changes take effect when you
receive them, "that's a way of forcing actual time to match record time" — one dimension, done.

**That is the simpler pattern that gets 90% of the value.** One validity range per rule version.
Edits take effect from tomorrow. The past is not editable, so there is nothing for a second time
dimension to record.

### Postgres mechanics

Range types are made for this ([PostgreSQL: Range Types](https://www.postgresql.org/docs/current/rangetypes.html)):

- "Range types are useful because they represent many element values in a single range value, and
  because concepts such as overlapping ranges can be expressed clearly. The use of time and date
  ranges for scheduling purposes is the clearest example."
- `daterange` and `tstzrange` are built in. `daterange` is discrete and canonicalises to `[)` —
  "the built-in range types `int4range`, `int8range`, and `daterange` all use a canonical form that
  includes the lower bound and excludes the upper bound".
- An omitted bound is unbounded: "if the upper bound of the range is omitted, then all values greater
  than the lower bound are included in the range". This is the open-ended rule, without `NULL` and
  without Craig Ringer's `CASE` expressions.

Non-overlap is a constraint, not application logic. The same page: "While `UNIQUE` is a natural
constraint for scalar values, it is usually unsuitable for range types. Instead, an exclusion
constraint is often more appropriate." Scoping the non-overlap to a key column needs `btree_gist`,
and the docs give the exact pattern:

```sql
CREATE EXTENSION btree_gist;
CREATE TABLE room_reservation (
    room text,
    during tsrange,
    EXCLUDE USING GIST (room WITH =, during WITH &&)
);
```

**A note on PostgreSQL 18 and 19, because the web is confused about this.** PostgreSQL 18 did add
SQL:2011-style temporal keys: its release notes record "Allow the specification of non-overlapping
PRIMARY KEY, UNIQUE, and foreign key constraints … specified by `WITHOUT OVERLAPS` for PRIMARY KEY
and UNIQUE, and by PERIOD for foreign keys". The
[PG18 `CREATE TABLE` docs](https://www.postgresql.org/docs/18/sql-createtable.html) then say the
quiet part out loud: "`UNIQUE (id, valid_at WITHOUT OVERLAPS)` behaves like
`EXCLUDE USING GIST (id WITH =, valid_at WITH &&)`", and "By default, only range types are
supported, but you can use other types by adding the `btree_gist` extension (which is the expected
way to use this feature)." The dedicated
[Temporal Tables chapter](https://www.postgresql.org/docs/19/ddl-temporal-tables.html) only appears
in the PostgreSQL 19 docs; there is no such page under `/docs/17/` or `/docs/18/`.

Crumpet's `supabase/config.toml` pins `major_version = 17`. So the nicer syntax is not available,
and the `EXCLUDE USING GIST` form is not a workaround — it is literally the same constraint.

---

## 4. Timezones and local times

### The rule

A feeding time is a **wall-clock time in the household's timezone**. 7am stays 7am across a
daylight-saving change. Nylas states the expectation directly: "When a timezone transitions into or
out of daylight savings, repeating events are expected to remain at the same local time … lunch is
always scheduled for 12:30, even if the underlying UTC time is an hour earlier or later."

Jon Skeet's [Storing UTC is not a silver bullet](https://codeblog.jonskeet.uk/2019/03/27/storing-utc-is-not-a-silver-bullet/)
gives the reason to keep the local time as the stored value rather than a derived instant. Store the
local date/time the user entered plus the timezone id; treat any UTC value as derived. When IANA
ships new rules, re-derive. The principle is "storing what the user actually told you".

Crumpet already does this — `scheduled_time time` plus `households.timezone` — and it is right.

### What Postgres says about the types

From the [Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html) docs:

> "Time zones in the real world have little meaning unless associated with a date as well as a time,
> since the offset can vary through the year with daylight-saving time boundaries."

and

> "The type `time with time zone` is defined by the SQL standard, but the definition exhibits
> properties which lead to questionable usefulness. … We do *not* recommend using the type `time
> with time zone`."

The [Don't Do This](https://wiki.postgresql.org/wiki/Don%27t_Do_This) wiki repeats it, and adds
"Don't use `CURRENT_TIME`" — it returns `timetz`.

The docs also make the case for full zone names over abbreviations: "abbreviations represent a
specific offset from UTC, whereas many of the full names imply a local daylight-savings time rule,
and so have two possible UTC offsets."

Resolution is `AT TIME ZONE`, and it is directional
([Date/Time Functions](https://www.postgresql.org/docs/current/functions-datetime.html)):

- `timestamp without time zone AT TIME ZONE zone → timestamp with time zone` — "assuming the given
  value is in the named time zone".
- `timestamp with time zone AT TIME ZONE zone → timestamp without time zone` — "as the time would
  appear in that zone".

`(local_date + local_time) AT TIME ZONE household_tz` is the first form. That is exactly what
`private.slot_states` does.

### What breaks on a DST transition

Postgres does not raise on a 7am that occurs twice or not at all. Appendix B.2,
[Handling of Invalid or Ambiguous Timestamps](https://www.postgresql.org/docs/current/datetime-invalid-input.html),
gives the rule verbatim:

> "The precise rule that is applied in such cases is that an invalid timestamp that appears to fall
> within a jump-forward daylight savings transition is assigned the UTC offset that prevailed in the
> time zone just before the transition, while an ambiguous timestamp that could fall on either side
> of a jump-back transition is assigned the UTC offset that prevailed just after the transition. In
> most time zones this is equivalent to saying that 'the standard-time interpretation is preferred
> when in doubt'."

With the worked examples: under `America/New_York`, `'2018-03-11 02:30'::timestamptz` becomes
`2018-03-11 03:30:00-04` (the 2:30am that never happened slides forward an hour), and
`'2018-11-04 01:30'::timestamptz` becomes `2018-11-04 01:30:00-05` (the *second* 1:30am).

So the behaviour is deterministic and defensible. A 7am feed is never affected — transitions are at
2am or 3am in every zone Crumpet will see. A household that genuinely sets a 2:30am feed gets one
day a year where the feed happens an hour early or late in absolute terms, and the Grace Window
absorbs most of that.

**The real DST hazard is arithmetic, not storage.** A local day is not 24 hours on a transition
date. Adding `interval '1 day'` to a `timestamptz` always adds exactly 24 hours, so the bound lands
in the wrong place. Crumpet already hit this and fixed it in
`20260725090600_fix_slot_states_dst_and_determinism.sql`: the next local midnight is re-resolved with
`(target_date + 1)::timestamp at time zone tz` rather than derived by addition. Keep that rule.

One remaining gap: `households.timezone` is unconstrained `text` set by the client, and
`now() at time zone <garbage>` raises. `sweep_missed_feeds` wraps every pet in its own exception
block for exactly this reason. That is a workaround for a missing constraint.

---

## 5. Matching intent to reality

Three objects: an expected occurrence, an actual event, and a tolerance window. Clinical informatics
has modelled this precisely, and the vocabulary is better than anything I would invent.

### FHIR: the order, the administration, and the link between them

FHIR separates them into distinct resources:

- **MedicationRequest** — "An order for both supply of the medication and the instructions for
  administration." This is the intent. Its `dosageInstruction` carries a `Timing`.
- **MedicationAdministration** — "Describes the event of a patient consuming or otherwise being
  administered a medication." This is reality.
  ([MedicationAdministration](https://build.fhir.org/medicationadministration.html))

The link is **stored**, on the actual, pointing at the intent: `MedicationAdministration.request` is
"the original request, instruction or authority to perform the administration".

Two further details worth stealing:

- **`occurrence[x]` and `recorded` are separate fields.** `occurrence[x]` is "a specific date/time
  or interval of time during which the administration took place"; `recorded` is "the date the
  occurrence of the MedicationAdministration was first captured in the record", potentially much
  later. Crumpet's `logged_at` / `created_at` split is the same distinction, and the sweep already
  relies on it.
- **A dose not given is a first-class record**, not an absence: `status: not-done` plus a
  `statusReason`.

FHIR also uses "slot", but for something else entirely:
[Slot](https://build.fhir.org/slot.html) is "a slot of time on a schedule that may be available for
booking appointments" — "effectively spaces of free/busy time". Relevant to the naming section: in
the one standard that uses the word, a slot is a *bookable capacity*, not a *scheduled event*.

### Medication adherence: the words for the comparison itself

The [ABC taxonomy](https://pmc.ncbi.nlm.nih.gov/articles/PMC3403197/) (Vrijens et al., 2012) is the
consensus vocabulary. Its definitions:

- **Adherence to medications** — "The process by which patients take their medications as
  prescribed, composed of initiation, implementation and discontinuation."
- **Initiation** — "occurs when the patient takes the first dose of a prescribed medication."
- **Implementation** — "the extent to which a patient's actual dosing corresponds to the prescribed
  dosing regimen, from initiation until the last dose."
- **Discontinuation** — "occurs when the patient stops taking the prescribed medication, for
  whatever reason(s)."
- **Persistence** — "the length of time between initiation and the last dose, which immediately
  precedes discontinuation."

**Implementation** is precisely Crumpet's problem: actual dosing versus prescribed regimen. The
record of actuals is the **dosing history**. The paper also recommends retiring "compliance" for
carrying "negative connotations of patient passivity and subservience" — a naming instinct worth
copying when choosing between "Missed" and "Not Logged".

### The tolerance window

The [ISMP Acute Care Guidelines for Timely Administration of Scheduled Medications](https://www.ismp.org/sites/default/files/attachments/2018-02/tasm.pdf)
define the categories and the tolerances. *(A caveat on sourcing: this PDF's text layer uses a
subset font. I reconstructed the prose from it directly; the numerals did not survive extraction and
are corroborated against
[Medscape's summary of the same guidelines](https://www.medscape.com/viewarticle/772501_4).)*

- **Scheduled medications** "include all maintenance doses administered according to a standard
  repeated cycle of frequency". The guidelines exclude PRN (as-needed) doses.
- **Time-critical scheduled medications** "are those where early or delayed administration of
  maintenance doses of greater than [30] minutes before or after the scheduled dose may cause harm
  or result in substantial sub-optimal therapy or pharmacological effect."
- **Non-time-critical scheduled medications** "are those where early or delayed administration
  within a specified range of either [1] or [2] hours should not cause harm."
- Daily, weekly and monthly medications: within 2 hours either side. More frequent than daily but
  not more frequent than every 4 hours: within 1 hour either side.

Three findings from this:

1. **The window is symmetric — "before or after the scheduled time".** ADR 0009 arrived at the same
   shape independently, and it matches the strongest available clinical precedent.
2. **The tolerance is a property of the scheduled thing, not of the whole system.** ISMP grades it by
   how much the timing matters. Crumpet has one household-wide number.
3. **There is no crisp standard noun for the window.** ISMP writes it out longhand every time —
   "within N minutes before or after the scheduled time" — and the profession's shorthand is the
   pejorative "the 30-minute rule", which ISMP itself calls error-prone. "Administration window" is
   common usage but is not ISMP's term. **Crumpet's "Grace Window" is better than anything the
   sources offer.**

### Store the match, or derive it?

Both are defensible and the sources genuinely disagree, so here is the honest trade-off.

**Store it** — FHIR's choice, `MedicationAdministration.request`.

- The history is stable. What the app said in March still says that in June.
- Reads are a join, not a computation.
- The match is auditable — you can ask *why* a day looked fed.
- But every input to the match must trigger recomputation: editing a log's `logged_at`, editing the
  rule, adding an exception, changing the Grace Window. Crumpet's `logged_at` is deliberately
  mutable — backdating is a trust feature — so this is not hypothetical. Miss one trigger and you
  get a silent divergence, which is the exact failure ADR 0009 was written to prevent.

**Derive it** — Crumpet's current choice.

- One implementation of "satisfying", so the Home screen, the Double Feed guard and the sweep cannot
  disagree.
- Backdating a log is correct the instant it is written, with no triggers.
- Cheap at Crumpet's size: 2–4 rules per pet per day.
- But the answer moves. Change the schedule and last month reads differently. ADR 0009 accepts this
  and flags it for revisiting — that is this research.

The distinction that resolves it: **the match is derived, but the alert is a record.** An `alerts`
row is already a stored, immutable fact — "at 08:15 on 14 March we told this household nobody had
logged the morning feed". That is the audit trail. It does not need a second one. What history
actually needs is not a frozen match but a **frozen rule**, so that recomputing March against
March's schedule gives March's answer. That is section 3, and it costs one range column.

---

## 6. Naming

The real technical vocabulary, from the sources.

| Concept | RFC 5545 | Microsoft Graph | Google Calendar | FHIR / clinical |
|---|---|---|---|---|
| The rule | `RRULE`, *recurrence rule*; the whole component is the **master** | `recurrence` (`patternedRecurrence`); the row is a **`seriesMaster`** | **recurring event** | `Timing`; the order is a **MedicationRequest** |
| All instances of it | **recurrence set** | the **series** | — | *prescribed dosing regimen* |
| One expected instance | **recurrence instance**; also *occurrence* | **`occurrence`** (an `eventType` value) | **instance** | *scheduled dose*; `occurrence[x]` |
| Its stable identity | **`RECURRENCE-ID`** — "the original value of the DTSTART property of the recurrence instance" | `seriesMasterId` + **`originalStart`** | `recurringEventId` + `originalStartTime` | — |
| It happened | — (calendars do not model this) | — | — | **MedicationAdministration**; the set is the **dosing history** |
| Link from actual to intended | — | — | — | **`.request`** — "the original request, instruction or authority" |
| Deliberately removed | **`EXDATE`** (*exception date*) | **`cancelledOccurrences`** | *cancelled* instance | `status: not-done` + `statusReason` |
| Changed for one date | **override** / *modified instance*; `RECURRENCE-ID` | **`exception`** (an `eventType` value) | **exception** | — |
| Added one-off date | **`RDATE`** | — | — | `Timing.event` |
| This and all future | **`RANGE=THISANDFUTURE`** | — | — | — |
| Tolerance around the time | — | — | — | no noun; "within N minutes before or after the scheduled time" |
| Actual vs intended, compared | — | — | — | **implementation** (ABC taxonomy) |

Observations worth carrying into the design:

- **"Occurrence" is the most widely agreed word** for one expected instance. Graph uses it as an
  enum value; RFC 5545 uses "recurrence instance" and "occurrence" interchangeably; Google uses
  "instance".
- **Every system keys an occurrence by its original scheduled time**, not by a row id. `RECURRENCE-ID`,
  `originalStart` and `originalStartTime` are the same idea three times. A moved occurrence keeps the
  key it was born with.
- **"Exception" is overloaded and worth avoiding.** RFC 5545 uses `EXDATE` for a *removal*; Graph
  uses `exception` for a *modification* and `cancelledOccurrence` for a removal. Two standards, two
  opposite meanings for one word.
- **"Slot" has a meaning in FHIR, and it is not this one.** A FHIR Slot is bookable capacity — "spaces
  of free/busy time". Crumpet's slot is a commitment, not an opening. That is a genuine reason to
  drop the word beyond taste.
- **Nothing in the standards names the tolerance window.** Grace Window stands.

---

# Recommended shape for Crumpet

**This section is my recommendation, not cited fact.** Everything above is sourced; what follows is
a judgement call about this app.

## The three decisions

**1. Compute occurrences. Materialise nothing.**

Crumpet asks one question — "what is expected for this pet on this local date?" — over 2–4 rules per
pet. The performance argument for materialising does not exist at this size, and the drift risk is
real. Everything a materialised table would buy is bought more cheaply below.

**2. Effective-date the rule. That is the whole history fix.**

An edit closes the current version and opens a successor from tomorrow. Recomputing March reads
March's rule, so history is stable *without* freezing any match. This is Fowler's Effectivity, one
time dimension, and it is what the calendar world does anyway when it splits a series on
`THISANDFUTURE`.

**3. Keep the match derived.**

ADR 0009's reasoning holds and gets stronger, not weaker: `logged_at` stays mutable, so a stored
match would need four triggers to stay honest. The history problem that made a stored match tempting
is solved by decision 2 instead.

## Schema sketch

```sql
create extension if not exists btree_gist;

-- One row per version of one recurring feed time.
-- Every version of the same feed time shares a series_id; that is the stable
-- identity, and it is what alerts and occurrence keys point at.
create table public.feed_times (
  id           uuid primary key default gen_random_uuid(),
  series_id    uuid not null default gen_random_uuid(),
  pet_id       uuid not null references public.pets(id) on delete cascade,
  label        public.feeding_schedule_label not null,

  -- Wall-clock, interpreted in households.timezone. Never timetz.
  local_time   time not null,

  -- ISO day numbers, 1 = Monday. Default is every day, which is today's behaviour.
  days_of_week smallint[] not null default '{1,2,3,4,5,6,7}',

  -- Local dates over which this version is in force. [) and half-open:
  -- daterange(created_local_date + 1, null) is "from tomorrow, forever".
  effective    daterange not null,

  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),

  constraint feed_times_days_nonempty
    check (array_length(days_of_week, 1) between 1 and 7),
  constraint feed_times_days_in_range
    check (days_of_week <@ array[1,2,3,4,5,6,7]::smallint[]),

  -- One feed time cannot be in force twice on the same local date.
  constraint feed_times_no_overlap
    exclude using gist (series_id with =, effective with &&)
);

-- EXDATE and RECURRENCE-ID, in one table, keyed by the ORIGINAL local date.
create table public.feed_time_exceptions (
  id          uuid primary key default gen_random_uuid(),
  series_id   uuid not null,
  pet_id      uuid not null references public.pets(id) on delete cascade,
  local_date  date not null,                       -- the RECURRENCE-ID
  kind        text not null check (kind in ('skipped', 'moved')),
  local_time  time,                                -- required when kind = 'moved'
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),

  constraint feed_time_exceptions_moved_has_time
    check ((kind = 'moved') = (local_time is not null)),
  unique (series_id, local_date)
);

-- Validate the timezone so the sweep's per-pet exception block stops being the
-- only thing between one bad row and a silent outage. A CHECK constraint cannot
-- do this -- Postgres forbids subqueries in CHECK, and pg_timezone_names is not
-- immutable -- so it is a BEFORE INSERT OR UPDATE trigger.
create or replace function private.assert_valid_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end $$;

create trigger households_timezone_valid
  before insert or update of timezone on public.households
  for each row execute function private.assert_valid_timezone();
```

`feed_logs` is unchanged. It is already the right shape — FHIR's `occurrence[x]` / `recorded` split
is Crumpet's `logged_at` / `created_at`.

The occurrence function replaces the `created_at::date < target_date` hack outright:

```sql
-- Expected feeds for one pet on one local date. No rows are stored for these.
create or replace function private.feed_occurrences(target_pet_id uuid, target_date date)
returns table (series_id uuid, label public.feeding_schedule_label, local_time time)
language sql stable security invoker set search_path = ''
as $$
  select
    ft.series_id,
    ft.label,
    coalesce(ex.local_time, ft.local_time)
  from public.feed_times ft
  left join public.feed_time_exceptions ex
    on ex.series_id = ft.series_id
   and ex.local_date = target_date
  where ft.pet_id = target_pet_id
    and ft.effective @> target_date
    and extract(isodow from target_date)::smallint = any (ft.days_of_week)
    and coalesce(ex.kind, '') <> 'skipped';
$$;
```

`private.slot_states` then keeps its greedy assignment and its `at time zone` arithmetic verbatim,
and only swaps its slot CTE for a call to this function.

## Consequences worth stating up front

- **The occurrence key becomes `(series_id, local_date)`.** This is `RECURRENCE-ID` by another name,
  and it is what makes the alert idempotency index survive an edit. Today `alerts.subject_id` is
  `feeding_schedules.id`; under effective dating a row id changes on every edit, so **`subject_id`
  must become `series_id`** or a single edit re-nudges a household for a day it was already told
  about. This is the migration's sharpest edge.
- **Editing closes a range and opens a new one.** Set the current version's
  `effective = daterange(lower(effective), tomorrow)`, then insert the successor with the same
  `series_id` and `effective = daterange(tomorrow, null)`. The exclusion constraint makes a botched
  edit fail loudly instead of producing two rules for one day.
- **"From tomorrow" is now a real concept, not a filter.** The rule that adding a 7am feed at 3pm
  must not retroactively mark today as missed becomes `daterange(tomorrow, null)` — declared in the
  data rather than re-implemented in every query that reads it.
- **`slot_states` needs a `security definer` review.** It is currently `security invoker` and RLS on
  `feeding_schedules` carries the load. Two new tables mean two new policy sets, and the sweep runs
  as service role through the same function.
- **This wants pgTAP before it ships.** ARCHITECTURE.md already says Jest cannot reach any of this.
  A schedule edit that silently rewrites February is invisible to every test currently in the repo.

## What I would not do, and why

**Would not store an RRULE string.** Postgres cannot expand one — no core function, no extension —
so "what is due today" would have to leave the database. ADR 0009 and
[ADR 0013](../adr/0013-missed-feed-detection-is-a-database-sweep.md) both forbid exactly that. And
Crumpet needs about 1% of RRULE. Generate one at the API boundary if an export ever needs it.

**Would not materialise occurrence rows.** ~1,100 rows per pet per year to answer a question that a
function answers in microseconds, plus a horizon to choose, a backfill job to run, and a new failure
mode where rows disagree with their rule. RFC 4791's own justification for keeping a series in one
resource is that it "avoids problems of limiting how many recurrence instances to store".

**Would not go bitemporal.** Fowler: "If we can avoid using bitemporal history, then that's usually
preferable as it does complicate a system quite significantly." Crumpet has no retroactive rule
edits — a schedule change applies from tomorrow — so actual time and record time never diverge, and
the second dimension would record nothing.

**Would not store the satisfying-feed match.** `logged_at` is mutable by design. A stored match needs
recomputation on four separate events, and every path that forgets one becomes a silent divergence
between Home and the sweep. FHIR stores its equivalent link, and that is a real counter-argument —
but FHIR's administrations are not routinely backdated by the people who performed them.

**Would not use `timetz`.** Postgres itself: "we do *not* recommend using the type `time with time
zone`."

**Would not precompute a UTC instant for a future occurrence.** Skeet's argument: store what the user
told you, derive the instant. A tzdata change would otherwise silently move every stored feed time.

**Would not add per-feed-time Grace Windows yet.** ISMP grades tolerance by how much timing matters,
and that is genuinely more correct — a puppy's 4-hourly feed is not a monthly worm tablet. But it is
a second configurable number and a second thing to explain, and ADR 0009 already rejected asymmetric
windows on the same grounds. Note it as the obvious v2.

**Would not support `INTERVAL`-style recurrence ("every 3 days") in v1.** Day-of-week covers
weekdays-only, weekends-only and single-day rules, which is the realistic demand. Interval
recurrence needs an anchor date and turns the daily query into modular arithmetic. If it is ever
needed it is two columns and one clause — `and (target_date - anchor_date) % interval_days = 0` —
so deferring costs nothing.

**Would not reach for PostgreSQL 18's `WITHOUT OVERLAPS`.** Supabase is pinned to 17 here, and the
PG18 docs say the temporal `UNIQUE` "behaves like `EXCLUDE USING GIST (id WITH =, valid_at WITH &&)`"
regardless. Nothing is being given up.

**Would not delete rows on edit.** Deleting the old version is what destroys history. Closing its
range is the edit.

**Would not keep "slot".** In FHIR — the one standard that uses the word — a Slot is bookable
capacity, "effectively spaces of free/busy time". Crumpet's is a commitment. The standards' word for
the rule is a **series** or **master**; for one expected instance it is an **occurrence**.

## Naming I would propose

Prose keeps **Feeding Schedule** (the set) and **Grace Window** (nothing in the sources beats it).

| Today | Proposed | Why |
|---|---|---|
| Scheduled Time / slot | **Feed Time** (`feed_times`) | What a member already calls it — "Bailey's morning feed" |
| — | **Occurrence** (`feed_occurrences`) | One expected feed on one date. Graph's `occurrence`, RFC 5545's recurrence instance |
| — | **Series** (`series_id`) | The identity that survives an edit. Graph's `seriesMaster` |
| — | **Skipped Feed** (`kind = 'skipped'`) | A deliberate `EXDATE`. **Collides with CONTEXT.md**, which currently lists "Skipped feed" as a term to avoid for Missed Feed — resolve before adopting, or use **Cancelled Feed** after Graph's `cancelledOccurrences` |
| — | **Moved Feed** (`kind = 'moved'`) | A one-date override. Graph's `exception`, RFC 5545's override |
| Feed Log | **Feed Log** | Keep. FHIR's MedicationAdministration; the set is the dosing history |
| Satisfying Feed | **Satisfying Feed** | Keep. FHIR names the link `.request`, which is worse here |
| Missed Feed / Not Logged | Keep both | The ABC taxonomy retired "compliance" for its connotations; the same instinct produced "Not Logged", and it was right |

## Sources

- [RFC 5545, Internet Calendaring and Scheduling Core Object Specification (iCalendar)](https://www.rfc-editor.org/rfc/rfc5545.html) — [§3.8.5.3 RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html), [§3.8.4.4 RECURRENCE-ID](https://icalendar.org/iCalendar-RFC-5545/3-8-4-4-recurrence-id.html)
- [RFC 7529, Non-Gregorian Recurrence Rules in iCalendar](https://www.rfc-editor.org/rfc/rfc7529.html)
- [RFC 4791, Calendaring Extensions to WebDAV (CalDAV)](https://www.rfc-editor.org/rfc/rfc4791.html)
- [draft-ietf-calext-icalendar-series-03, Support for Series in iCalendar](https://datatracker.ietf.org/doc/html/draft-ietf-calext-icalendar-series-03)
- [Nylas — The Deceptively Complex World of Calendar Events and RRULEs](https://www.nylas.com/blog/calendar-events-rrules/)
- [Microsoft Graph — event resource type](https://learn.microsoft.com/en-us/graph/api/resources/event) and [List calendarView](https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview)
- [Google Calendar API — Events and calendars](https://developers.google.com/workspace/calendar/api/concepts/events-calendars) and [Events: instances](https://developers.google.com/workspace/calendar/api/v3/reference/events/instances)
- [Martin Fowler — Recurring Events for Calendars (PDF)](https://martinfowler.com/apsupp/recurring.pdf)
- [Martin Fowler — Bitemporal History](https://martinfowler.com/articles/bitemporal-history.html)
- [pgsql-general — Craig Ringer on recurring events](https://www.postgresql.org/message-id/4DED5A8F.6020204@postnewspapers.com.au)
- [PostgreSQL — Range Types](https://www.postgresql.org/docs/current/rangetypes.html)
- [PostgreSQL — Date/Time Types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [PostgreSQL — Date/Time Functions and Operators (AT TIME ZONE)](https://www.postgresql.org/docs/current/functions-datetime.html)
- [PostgreSQL — B.2 Handling of Invalid or Ambiguous Timestamps](https://www.postgresql.org/docs/current/datetime-invalid-input.html)
- [PostgreSQL 18 — CREATE TABLE (WITHOUT OVERLAPS)](https://www.postgresql.org/docs/18/sql-createtable.html) and [PostgreSQL 19 — Temporal Tables](https://www.postgresql.org/docs/19/ddl-temporal-tables.html)
- [PostgreSQL wiki — Don't Do This](https://wiki.postgresql.org/wiki/Don%27t_Do_This)
- [Jon Skeet — Storing UTC is not a silver bullet](https://codeblog.jonskeet.uk/2019/03/27/storing-utc-is-not-a-silver-bullet/)
- [HL7 FHIR — Timing datatype](https://build.fhir.org/datatypes.html#Timing), [MedicationAdministration](https://build.fhir.org/medicationadministration.html), [Slot](https://build.fhir.org/slot.html)
- [Vrijens et al. (2012), A new taxonomy for describing and defining adherence to medications](https://pmc.ncbi.nlm.nih.gov/articles/PMC3403197/)
- [ISMP — Acute Care Guidelines for Timely Administration of Scheduled Medications (PDF)](https://www.ismp.org/sites/default/files/attachments/2018-02/tasm.pdf), summarised at [Medscape](https://www.medscape.com/viewarticle/772501_4)
