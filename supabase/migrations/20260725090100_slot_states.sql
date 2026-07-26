-- Derived slot matching, per ADR 0009. One function answers "has this slot
-- been fed?" for the Home screen, every Activity day header, the double-feed
-- warning and (later) the missed-feed cron, so those four surfaces cannot
-- disagree. Nothing is stored on feed_logs about which slot a log satisfied:
-- logged_at is mutable, so any match written at insert time goes stale the
-- moment a log is backdated.
--
-- It lives in `private` because ADR 0009 requires it and because `public` is a
-- PostgREST-exposed schema. `private` is not exposed, so the app cannot call
-- it directly -- hence the thin public wrapper at the bottom of this file.

create or replace function private.slot_states(target_pet_id uuid, target_date date)
returns table (
  schedule_id       uuid,
  scheduled_time    time,
  label             public.feeding_schedule_label,
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
  day_start timestamptz;
  -- schedule_id (text) -> log_id (text)
  assignment jsonb := '{}'::jsonb;
  -- the log ids already claimed by some slot
  claimed_logs jsonb := '[]'::jsonb;
  pair record;
begin
  -- All window arithmetic resolves in the household's timezone: Scheduled
  -- Times are wall-clock times with no date of their own.
  select households.timezone, make_interval(mins => households.grace_window_minutes)
    into household_timezone, grace
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if household_timezone is null then
    return;
  end if;

  day_start := target_date::timestamp at time zone household_timezone;

  -- Greedy global assignment. Nearest pair first; skip a pair if either side
  -- is already taken. Ties break toward the earlier slot, which is what makes
  -- a log sitting equidistant between two slots deterministic.
  for pair in
    with slots as (
      select
        feeding_schedules.id as slot_id,
        ((target_date + feeding_schedules.scheduled_time) at time zone household_timezone) as slot_at
      from public.feeding_schedules
      where feeding_schedules.pet_id = target_pet_id
    ),
    logs as (
      select feed_logs.id as log_id, feed_logs.logged_at as log_at
      from public.feed_logs
      where feed_logs.pet_id = target_pet_id
        and feed_logs.logged_at >= day_start - grace
        and feed_logs.logged_at < day_start + interval '1 day' + grace
    )
    select
      slots.slot_id,
      slots.slot_at,
      logs.log_id,
      logs.log_at,
      abs(extract(epoch from (logs.log_at - slots.slot_at))) as distance_seconds
    from slots
    join logs on logs.log_at between slots.slot_at - grace and slots.slot_at + grace
    order by distance_seconds asc, slots.slot_at asc, logs.log_at asc
  loop
    if (assignment ? pair.slot_id::text) or (claimed_logs ? pair.log_id::text) then
      continue;
    end if;

    assignment := assignment || jsonb_build_object(pair.slot_id::text, pair.log_id::text);
    claimed_logs := claimed_logs || to_jsonb(pair.log_id::text);
  end loop;

  -- `state` is returned by the function rather than derived client-side:
  -- deciding `missed` means comparing now() against scheduled_at + grace,
  -- which is the window arithmetic ADR 0009 forbids reimplementing in
  -- TypeScript.
  return query
  with slots as (
    select
      feeding_schedules.id as slot_id,
      feeding_schedules.scheduled_time as slot_time,
      feeding_schedules.label as slot_label,
      ((target_date + feeding_schedules.scheduled_time) at time zone household_timezone) as slot_at
    from public.feeding_schedules
    where feeding_schedules.pet_id = target_pet_id
  )
  select
    slots.slot_id,
    slots.slot_time,
    slots.slot_label,
    slots.slot_at,
    case
      when matched.id is not null then 'fed'
      when now() < slots.slot_at - grace then 'upcoming'
      when now() <= slots.slot_at + grace then 'due'
      else 'missed'
    end,
    matched.id,
    matched.logged_at,
    matched.logged_by
  from slots
  left join public.feed_logs as matched
    on matched.id = (assignment ->> slots.slot_id::text)::uuid
  order by slots.slot_at asc;
end;
$$;

-- The wrapper is `security invoker`, NOT definer, so the selects inside run as
-- the calling user and the existing RLS on feed_logs and feeding_schedules
-- applies unchanged. A definer wrapper would expose any household's feeding
-- history to any authenticated user. The missed-feed cron reaches the same
-- function as service role, which bypasses RLS by design.
--
-- The column list is repeated rather than shared through a composite type: a
-- named composite would have to live in `public` to appear in a `public`
-- function signature, which puts a type describing private internals into the
-- PostgREST-exposed schema for no gain.

create or replace function public.pet_slot_states(target_pet_id uuid, target_date date)
returns table (
  schedule_id       uuid,
  scheduled_time    time,
  label             public.feeding_schedule_label,
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
  select s.* from private.slot_states(target_pet_id, target_date) as s;
$$;

grant usage on schema private to authenticated, service_role;
grant execute on function private.slot_states(uuid, date) to authenticated, service_role;
grant execute on function public.pet_slot_states(uuid, date) to authenticated, service_role;
