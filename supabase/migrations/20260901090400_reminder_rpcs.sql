-- The two reads the client makes. private.* is not reachable through PostgREST,
-- so every screen-facing read needs a public wrapper -- the same split
-- pet_occurrence_states makes over private.occurrence_states.

create or replace function public.pet_reminders(
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
  select * from private.reminder_occurrences(target_pet_id, target_date);
$$;

revoke execute on function public.pet_reminders(uuid, date) from public, anon;
grant execute on function public.pet_reminders(uuid, date) to authenticated;

-- Which days in a week carry a Reminder, for the dot under the week strip. One
-- round trip for the whole strip: a query per day is seven, and the strip pages.
create or replace function public.household_reminder_days(
  target_household_id uuid,
  from_date date,
  to_date date
)
returns table (
  day date,
  kinds text[]
)
language sql
stable
set search_path = ''
as $$
  select
    days.day::date,
    -- The kinds on the day, not a count: the dot is drawn per kind, and two
    -- Reminders of one kind are still one colour.
    array_agg(distinct reminders.kind::text order by reminders.kind::text)
  from generate_series(from_date, least(to_date, from_date + 62), interval '1 day') as days(day)
  join public.pets on pets.household_id = target_household_id
  join public.reminders
    on reminders.pet_id = pets.id
    and reminders.deleted_at is null
    and private.reminder_falls_on(reminders.starts_on, reminders.repeat, days.day::date)
  where private.is_household_member(target_household_id)
  group by days.day
  order by days.day;
$$;

revoke execute on function public.household_reminder_days(uuid, date, date) from public, anon;
grant execute on function public.household_reminder_days(uuid, date, date) to authenticated;
