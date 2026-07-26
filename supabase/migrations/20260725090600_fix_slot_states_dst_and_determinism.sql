-- Fixes to private.slot_states / public.pet_slot_states found in review:
--
-- 1. DST: the candidate-log prefilter bounded the upper edge of the local day
--    with `day_start + interval '1 day'`. That form always adds exactly 24
--    hours because timestamptz + interval resolves in the session timezone,
--    but a household's local day is 25 hours on a fall-back date and 23 hours
--    on a spring-forward date. On a 25-hour day the prefilter closed an hour
--    before the last slot's grace window did, so a log inside the true window
--    was excluded before the join ever saw it. Recomputing the next local
--    midnight with `at time zone` (rather than adding an interval to an
--    already-resolved timestamptz) makes the bound track the household's
--    actual local day length.
--
-- 2. Determinism: two logs at the identical instant competing for the same
--    slot tied on every existing order-by key (distance, slot_at, log_at), so
--    `satisfying_log_id` depended on physical row order. Added log id as a
--    final total tiebreak.
--
-- 3. Grants: `anon` and `PUBLIC` held EXECUTE on the public wrapper, and every
--    function in `private` carries default PUBLIC EXECUTE, by Postgres/
--    Supabase default privileges. The `private` schema's USAGE grant already
--    stops an anon call cold, but that left the safety resting on a single
--    grant; explicitly revoking EXECUTE removes the redundant surface so an
--    unauthenticated call is denied at the function itself.

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
  next_day_start timestamptz;
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
  -- A local day is not always 24 hours (DST fall-back/spring-forward), so the
  -- next local midnight has to be resolved with `at time zone` again rather
  -- than by adding interval '1 day' to the already-resolved `day_start`.
  next_day_start := (target_date + 1)::timestamp at time zone household_timezone;

  -- Greedy global assignment. Nearest pair first; skip a pair if either side
  -- is already taken. Ties break toward the earlier slot, then the earlier
  -- log; if two logs sit at the exact same instant equidistant from the same
  -- slot, the log id is the final tiebreak, so the result never depends on
  -- physical row order.
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
        and feed_logs.logged_at < next_day_start + grace
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

-- private.is_household_member / is_household_owner / is_pet_household_member /
-- is_pet_household_owner (from 20260722120100 and 20260723090000) have never
-- carried an explicit grant of their own -- they have only ever been callable
-- via the default PUBLIC EXECUTE that every new function gets, gated solely by
-- `authenticated` holding USAGE on the `private` schema. They are invoked from
-- inside RLS USING/WITH CHECK expressions on households, household_members,
-- pets and feed_logs, which run as the querying role, so revoking the default
-- PUBLIC grant on the whole schema below would otherwise take EXECUTE away
-- from `authenticated` on all of them and break that RLS wholesale. Grant it
-- explicitly first so the schema-wide revoke only removes the redundant
-- anon/PUBLIC path, not the one production traffic actually depends on.
grant execute on function private.is_household_member(uuid) to authenticated, service_role;
grant execute on function private.is_household_owner(uuid) to authenticated, service_role;
grant execute on function private.is_pet_household_member(uuid) to authenticated, service_role;
grant execute on function private.is_pet_household_owner(uuid) to authenticated, service_role;

revoke execute on function public.pet_slot_states(uuid, date) from public, anon;
revoke all on all functions in schema private from public;
