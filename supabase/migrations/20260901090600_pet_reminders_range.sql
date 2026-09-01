-- CRU-095. A Reminder is not a today-only thing. The point of writing one down
-- is that the vet appointment is in three weeks, so the Pet screen has to be
-- able to read forward, not just at the household's today.
--
-- A range rather than a second single-day call per date: the client would
-- otherwise issue one round trip per day of the horizon to find the two days
-- that carry anything.

create or replace function public.pet_reminders_range(
  target_pet_id uuid,
  from_date date,
  to_date date
)
returns table (
  occurrence_date date,
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
  select days.day::date, occurrences.*
  -- Bounded at a year. A weekly rule read over an open range is unbounded, and
  -- nothing on a screen wants the 300th occurrence of it.
  from generate_series(from_date, least(to_date, from_date + 366), interval '1 day') as days(day)
  cross join lateral private.reminder_occurrences(target_pet_id, days.day::date) as occurrences
  order by days.day, occurrences.local_time, occurrences.title;
$$;

revoke execute on function public.pet_reminders_range(uuid, date, date) from public, anon;
grant execute on function public.pet_reminders_range(uuid, date, date) to authenticated;
