-- A slot applies from the day AFTER it was created. Adding a 7am feed at 3pm
-- otherwise renders it Missed for a feed nobody was ever asked to give, which
-- is the exact "log you cannot trust" failure the product brief calls fatal.
--
-- The filter is applied in BOTH slot CTEs. Omitting it from the assignment CTE
-- would let a slot that does not exist yet claim a log away from one that does.

create or replace function private.slot_states(
  target_pet_id uuid,
  target_date date,
  hypothetical_at timestamptz default null
)
returns table (
  schedule_id            uuid,
  scheduled_time         time,
  label                  public.feeding_schedule_label,
  scheduled_at           timestamptz,
  state                  text,
  satisfying_log_id      uuid,
  satisfied_at           timestamptz,
  satisfied_by           uuid,
  hypothetical_in_window boolean
)
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  household_timezone text;
  grace interval;
  day_start timestamptz;
  next_day_start timestamptz;
  hypothetical_log_id constant uuid := '00000000-0000-0000-0000-000000000001';
  assignment jsonb := '{}'::jsonb;
  claimed_logs jsonb := '[]'::jsonb;
  pair record;
begin
  select households.timezone, make_interval(mins => households.grace_window_minutes)
    into household_timezone, grace
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if household_timezone is null then
    return;
  end if;

  day_start := target_date::timestamp at time zone household_timezone;
  next_day_start := (target_date + 1)::timestamp at time zone household_timezone;

  for pair in
    with slots as (
      select
        feeding_schedules.id as slot_id,
        ((target_date + feeding_schedules.scheduled_time) at time zone household_timezone) as slot_at
      from public.feeding_schedules
      where feeding_schedules.pet_id = target_pet_id
        and (feeding_schedules.created_at at time zone household_timezone)::date < target_date
    ),
    logs as (
      select feed_logs.id as log_id, feed_logs.logged_at as log_at
      from public.feed_logs
      where feed_logs.pet_id = target_pet_id
        and feed_logs.logged_at >= day_start - grace
        and feed_logs.logged_at < next_day_start + grace
      union all
      select hypothetical_log_id, hypothetical_at
      where hypothetical_at is not null
    )
    select
      slots.slot_id,
      slots.slot_at,
      logs.log_id,
      logs.log_at,
      abs(extract(epoch from (logs.log_at - slots.slot_at))) as distance_seconds
    from slots
    join logs on logs.log_at between slots.slot_at - grace and slots.slot_at + grace
    order by distance_seconds asc, slots.slot_at asc, logs.log_at asc, logs.log_id asc
  loop
    if (assignment ? pair.slot_id::text) or (claimed_logs ? pair.log_id::text) then
      continue;
    end if;

    assignment := assignment || jsonb_build_object(pair.slot_id::text, pair.log_id::text);
    claimed_logs := claimed_logs || to_jsonb(pair.log_id::text);
  end loop;

  return query
  with slots as (
    select
      feeding_schedules.id as slot_id,
      feeding_schedules.scheduled_time as slot_time,
      feeding_schedules.label as slot_label,
      ((target_date + feeding_schedules.scheduled_time) at time zone household_timezone) as slot_at
    from public.feeding_schedules
    where feeding_schedules.pet_id = target_pet_id
      and (feeding_schedules.created_at at time zone household_timezone)::date < target_date
  )
  select
    slots.slot_id,
    slots.slot_time,
    slots.slot_label,
    slots.slot_at,
    case
      when assignment ? slots.slot_id::text then 'fed'
      when now() < slots.slot_at - grace then 'upcoming'
      when now() <= slots.slot_at + grace then 'due'
      else 'missed'
    end,
    (assignment ->> slots.slot_id::text)::uuid,
    matched.logged_at,
    matched.logged_by,
    case
      when hypothetical_at is null then null::boolean
      else hypothetical_at between slots.slot_at - grace and slots.slot_at + grace
    end
  from slots
  left join public.feed_logs as matched
    on matched.id = (assignment ->> slots.slot_id::text)::uuid
  order by slots.slot_at asc;
end;
$$;
