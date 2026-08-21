-- Phase 2 of CRU-066. See docs/adr/0030-feed-times-are-versioned-not-edited.md.
--
-- private.slot_states stays in place and untouched. log_feed and the
-- missed-feed sweep still call it, and both are rewritten in phase 3 -- so
-- replacing it here would break the running app between two commits.
-- It is dropped in phase 4 alongside feeding_schedules.

-- Backfill. Under ADR 0029 a log with no series is an Extra Feed, which
-- satisfies nothing. Every log predates the column, so without this every past
-- day would read as unfed the moment the matcher stops inferring from the
-- timestamp. This replays the greedy matcher once and records what it decided.

do $$
declare
  pet record;
  local_date date;
begin
  for pet in
    select
      pets.id as pet_id,
      households.timezone as tz,
      min((feed_logs.logged_at at time zone households.timezone)::date) as first_day,
      max((feed_logs.logged_at at time zone households.timezone)::date) as last_day
    from public.feed_logs
    join public.pets on pets.id = feed_logs.pet_id
    join public.households on households.id = pets.household_id
    group by pets.id, households.timezone
  loop
    -- One day either side: a Grace Window can reach across local midnight.
    for local_date in
      select generate_series(pet.first_day - 1, pet.last_day + 1, interval '1 day')::date
    loop
      update public.feed_logs
      set feed_time_series_id = feed_times.series_id,
          occurrence_date = local_date
      from private.slot_states(pet.pet_id, local_date) as states
      join public.feeding_schedules on feeding_schedules.id = states.schedule_id
      join public.feed_times
        on feed_times.pet_id = feeding_schedules.pet_id
       and feed_times.label = feeding_schedules.label
       and feed_times.local_time = feeding_schedules.scheduled_time
       and feed_times.created_at = feeding_schedules.created_at
      where feed_logs.id = states.satisfying_log_id
        and feed_logs.feed_time_series_id is null;
    end loop;
  end loop;
end;
$$;

-- Occurrences: the feed times in effect on a local date, expanded.
-- Never materialised -- the rule stays the source of truth.

create function private.feed_occurrences(target_pet_id uuid, target_date date)
returns table (
  series_id    uuid,
  label        public.feeding_schedule_label,
  local_time   time,
  instructions text
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    feed_times.series_id,
    feed_times.label,
    feed_times.local_time,
    feed_times.instructions
  from public.feed_times
  where feed_times.pet_id = target_pet_id
    and feed_times.effective @> target_date
    -- extract(dow) is 0=Sunday..6=Saturday, which is the encoding
    -- days_of_week uses. Do not swap it for isodow.
    and extract(dow from target_date)::smallint = any (feed_times.days_of_week)
    and not exists (
      select 1
      from public.pet_pauses
      where pet_pauses.pet_id = target_pet_id
        and pet_pauses.during @> target_date
    );
$$;

-- Occurrence states. The greedy timestamp matcher is gone: a log names the
-- occurrence it satisfies, so this is a lookup. The `at time zone` arithmetic
-- is carried over verbatim from private.slot_states -- a local day is not
-- always 24 hours, so the next local midnight is resolved again rather than
-- reached by adding a day.

create function private.occurrence_states(target_pet_id uuid, target_date date)
returns table (
  series_id         uuid,
  local_time        time,
  label             public.feeding_schedule_label,
  instructions      text,
  scheduled_at      timestamptz,
  state             text,
  satisfying_log_id uuid,
  satisfied_at      timestamptz,
  satisfied_by      uuid
)
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  household_timezone text;
  grace interval;
begin
  select households.timezone, make_interval(mins => households.grace_window_minutes)
    into household_timezone, grace
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if household_timezone is null then
    return;
  end if;

  return query
  with occurrences as (
    select
      feed_occurrences.series_id,
      feed_occurrences.label,
      feed_occurrences.local_time,
      feed_occurrences.instructions,
      ((target_date + feed_occurrences.local_time) at time zone household_timezone) as occurrence_at
    from private.feed_occurrences(target_pet_id, target_date) as feed_occurrences
  )
  select
    occurrences.series_id,
    occurrences.local_time,
    occurrences.label,
    occurrences.instructions,
    occurrences.occurrence_at,
    case
      when matched.id is not null then 'fed'
      when now() < occurrences.occurrence_at - grace then 'upcoming'
      when now() <= occurrences.occurrence_at + grace then 'due'
      else 'missed'
    end,
    matched.id,
    matched.logged_at,
    matched.logged_by
  from occurrences
  left join public.feed_logs as matched
    on matched.feed_time_series_id = occurrences.series_id
   and matched.occurrence_date = target_date
  order by occurrences.occurrence_at asc;
end;
$$;

create function public.pet_occurrence_states(target_pet_id uuid, target_date date)
returns table (
  series_id         uuid,
  local_time        time,
  label             public.feeding_schedule_label,
  instructions      text,
  scheduled_at      timestamptz,
  state             text,
  satisfying_log_id uuid,
  satisfied_at      timestamptz,
  satisfied_by      uuid
)
language sql
security invoker
set search_path = ''
stable
as $$
  select * from private.occurrence_states(target_pet_id, target_date);
$$;

-- A new function in `private` is born with the default PUBLIC EXECUTE that
-- 20260725090600 revoked. Re-apply the same grants.
grant execute on function private.feed_occurrences(uuid, date) to authenticated, service_role;
grant execute on function private.occurrence_states(uuid, date) to authenticated, service_role;
grant execute on function public.pet_occurrence_states(uuid, date) to authenticated, service_role;

revoke execute on function private.feed_occurrences(uuid, date) from public;
revoke execute on function private.occurrence_states(uuid, date) from public;
revoke execute on function public.pet_occurrence_states(uuid, date) from public, anon;
