-- Phase 1 of CRU-066. See docs/adr/0030-feed-times-are-versioned-not-edited.md.
--
-- feeding_schedules stays in place until phase 4 drops it. Everything here is
-- additive so the running app keeps working between the two commits.

create extension if not exists btree_gist;

-- Feed times: one row per version of a series.

create table public.feed_times (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  series_id uuid not null default gen_random_uuid(),
  label public.feeding_schedule_label not null,
  local_time time not null,
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}',
  instructions text check (instructions is null or length(instructions) <= 500),
  effective daterange not null,
  created_at timestamptz not null default now(),

  constraint feed_times_days_of_week_valid check (
    array_length(days_of_week, 1) between 1 and 7
    and days_of_week <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  ),

  -- Two versions of one series may never claim the same day. This is what
  -- makes "read the day through the schedule that applied then" a single
  -- unambiguous row rather than a pick between candidates.
  constraint feed_times_no_overlapping_versions
    exclude using gist (series_id with =, effective with &&)
);

create index feed_times_pet_id_effective_idx on public.feed_times using gist (pet_id, effective);
create index feed_times_series_id_idx on public.feed_times (series_id);

alter table public.feed_times enable row level security;

create policy "Members can view feed times for their household's pets"
on public.feed_times for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can create feed times"
on public.feed_times for insert
with check ( private.is_pet_household_owner(pet_id) );

create policy "Owners can update feed times"
on public.feed_times for update
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

create policy "Owners can delete feed times"
on public.feed_times for delete
using ( private.is_pet_household_owner(pet_id) );

-- Pauses: boarding, a vet stay, fasting before surgery. No feeds expected.

create table public.pet_pauses (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  during daterange not null,
  reason text check (reason is null or length(reason) <= 280),
  created_at timestamptz not null default now(),

  constraint pet_pauses_no_overlap
    exclude using gist (pet_id with =, during with &&)
);

create index pet_pauses_pet_id_during_idx on public.pet_pauses using gist (pet_id, during);

alter table public.pet_pauses enable row level security;

create policy "Members can view pauses for their household's pets"
on public.pet_pauses for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can create pauses"
on public.pet_pauses for insert
with check ( private.is_pet_household_owner(pet_id) );

create policy "Owners can update pauses"
on public.pet_pauses for update
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

create policy "Owners can delete pauses"
on public.pet_pauses for delete
using ( private.is_pet_household_owner(pet_id) );

-- A feed log names the feed it satisfies. Both columns null is an Extra Feed.
-- See docs/adr/0029-a-feed-log-names-the-feed-it-satisfies.md.

alter table public.feed_logs
  add column feed_time_series_id uuid,
  add column occurrence_date date,
  add constraint feed_logs_occurrence_is_whole check (
    (feed_time_series_id is null) = (occurrence_date is null)
  );

create unique index feed_logs_one_per_occurrence_idx
on public.feed_logs (feed_time_series_id, occurrence_date)
where feed_time_series_id is not null;

-- Pet type. TODO: more species are expected. Adding a value is
-- `alter type ... add value`, which cannot run in a transaction alongside
-- other DDL, so that day needs a migration of its own.

create type public.pet_type as enum ('dog', 'cat', 'other');

alter table public.pets add column pet_type public.pet_type not null default 'dog';

-- Backfill: each existing schedule becomes the first version of its own
-- series. The range starts on its created_at date in the household timezone,
-- which is exactly what slot_states_new_slots_start_tomorrow already filters on.

insert into public.feed_times (pet_id, label, local_time, effective, created_at)
select
  feeding_schedules.pet_id,
  feeding_schedules.label,
  feeding_schedules.scheduled_time,
  daterange((feeding_schedules.created_at at time zone households.timezone)::date, null, '[)'),
  feeding_schedules.created_at
from public.feeding_schedules
join public.pets on pets.id = feeding_schedules.pet_id
join public.households on households.id = pets.household_id;
