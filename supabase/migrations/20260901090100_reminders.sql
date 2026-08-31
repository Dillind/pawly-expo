-- CRU-078. A Reminder is a dated job on a Pet that is not a feed.
--
-- The shape follows feed_times deliberately: a rule table, and occurrences
-- derived on read rather than materialised. Two tables and no cron job yet --
-- the sweep that sends the push is the next migration.

create type public.reminder_kind as enum ('feed', 'medication', 'vet');
create type public.reminder_repeat as enum ('once', 'weekly', 'monthly');

create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 80),
  kind public.reminder_kind not null,
  -- The household's local wall clock, not an instant. A reminder set for 9:30am
  -- stays 9:30am when the household moves, exactly as a feed time does.
  starts_on date not null,
  local_time time not null,
  repeat public.reminder_repeat not null default 'once',
  lead_days smallint not null default 1 check (lead_days between 1 and 3),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Soft: a deleted rule must not take its completions with it, because the
  -- Activity feed still names what was done.
  deleted_at timestamptz
);

create index reminders_pet_id_idx on public.reminders (pet_id) where deleted_at is null;
create index reminders_created_by_idx on public.reminders (created_by);

-- One row per Reminder per date, and only once someone ticks it off. Absence is
-- the "not done" state, so nothing has to be written ahead of time -- which is
-- what lets a monthly rule run for years without a backfill.
create table public.reminder_completions (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  occurrence_date date not null,
  done_by uuid not null references auth.users(id) on delete cascade,
  done_at timestamptz not null default now(),

  constraint reminder_completions_one_per_occurrence unique (reminder_id, occurrence_date)
);

create index reminder_completions_reminder_id_idx
  on public.reminder_completions (reminder_id, occurrence_date desc);
create index reminder_completions_done_by_idx on public.reminder_completions (done_by);

-- Does this rule land on this date? Immutable, so an index can use it later and
-- the sweep can call it per row without a plan surprise.
create or replace function private.reminder_falls_on(
  rule_starts_on date,
  rule_repeat public.reminder_repeat,
  target_date date
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when target_date < rule_starts_on then false
    when rule_repeat = 'once' then target_date = rule_starts_on
    when rule_repeat = 'weekly' then (target_date - rule_starts_on) % 7 = 0
    -- The 31st in a 30-day month lands on the last day of that month rather
    -- than skipping it. A worming tablet that silently misses February is
    -- worse than one that arrives a day early.
    when rule_repeat = 'monthly' then
      extract(day from target_date) = least(
        extract(day from rule_starts_on),
        extract(day from (date_trunc('month', target_date) + interval '1 month - 1 day'))
      )
    else false
  end;
$$;

-- reminder_occurrences is not security definer, so it runs as the caller and
-- the caller needs this. It is pure arithmetic over its arguments and reads no
-- table, so granting it exposes nothing.
revoke execute on function private.reminder_falls_on(date, public.reminder_repeat, date)
  from public, anon;
grant execute on function private.reminder_falls_on(date, public.reminder_repeat, date)
  to authenticated;

-- One pet's Reminders for one local date, with the state the row needs.
create or replace function private.reminder_occurrences(
  target_pet_id uuid,
  target_date date
)
returns table (
  reminder_id uuid,
  title text,
  kind public.reminder_kind,
  local_time time,
  state text,
  done_by uuid,
  done_at timestamptz
)
language sql
stable
set search_path = ''
as $$
  select
    reminders.id,
    reminders.title,
    reminders.kind,
    reminders.local_time,
    case
      when reminder_completions.id is not null then 'done'
      when target_date > (now() at time zone households.timezone)::date then 'future'
      when target_date < (now() at time zone households.timezone)::date then 'missed'
      else 'due'
    end,
    reminder_completions.done_by,
    reminder_completions.done_at
  from public.reminders
  join public.pets on pets.id = reminders.pet_id
  join public.households on households.id = pets.household_id
  left join public.reminder_completions
    on reminder_completions.reminder_id = reminders.id
    and reminder_completions.occurrence_date = target_date
  where reminders.pet_id = target_pet_id
    and reminders.deleted_at is null
    and private.reminder_falls_on(reminders.starts_on, reminders.repeat, target_date)
  order by reminders.local_time, reminders.title;
$$;

grant execute on function private.reminder_occurrences(uuid, date) to authenticated;

-- RLS. Reading and ticking off are Member rights, because the point of a
-- Reminder is that anyone can deal with it. Editing the rule is not: a
-- recurring job is a household decision, so it stays with the Owner or with
-- whoever wrote it.

alter table public.reminders enable row level security;

create policy "Members can view reminders for their household's pets"
on public.reminders for select
using ( private.is_pet_household_member(pet_id) );

create policy "Members can create reminders"
on public.reminders for insert
with check (
  private.is_pet_household_member(pet_id)
  and created_by = (select auth.uid())
);

create policy "Owners and the author can update reminders"
on public.reminders for update
using ( private.is_pet_household_owner(pet_id) or created_by = (select auth.uid()) )
with check ( private.is_pet_household_owner(pet_id) or created_by = (select auth.uid()) );

create policy "Owners and the author can delete reminders"
on public.reminders for delete
using ( private.is_pet_household_owner(pet_id) or created_by = (select auth.uid()) );

alter table public.reminder_completions enable row level security;

create policy "Members can view completions for their household's pets"
on public.reminder_completions for select
using (
  private.is_pet_household_member(
    (select reminders.pet_id from public.reminders where reminders.id = reminder_id)
  )
);

create policy "Members can tick off a reminder"
on public.reminder_completions for insert
with check (
  done_by = (select auth.uid())
  and private.is_pet_household_member(
    (select reminders.pet_id from public.reminders where reminders.id = reminder_id)
  )
);

-- Untick. No update policy: a completion is either there or it is not, and
-- rewriting done_by would let one member reassign another's action.
create policy "Members can untick a reminder"
on public.reminder_completions for delete
using (
  private.is_pet_household_member(
    (select reminders.pet_id from public.reminders where reminders.id = reminder_id)
  )
);
