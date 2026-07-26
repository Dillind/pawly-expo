-- private.slot_states gains a third parameter: a hypothetical log timestamp,
-- so public.log_feed can ask "what would the assignment look like if this feed
-- existed?" without writing it. ADR 0009 puts every piece of Grace Window
-- arithmetic in this one function, so the question is answered here rather
-- than recomputed by the caller.
--
-- `create or replace function` cannot add a parameter -- it creates an
-- overload, and an overload whose extra parameter has a default makes every
-- existing two-argument call ambiguous (42725). Both functions are therefore
-- dropped and recreated at the new arity, and the grants and revokes from
-- 20260725090600 are re-applied: dropping a function drops its grants with it.
--
-- Two changes beyond the signature:
--
-- 1. `state` now reads the assignment map directly (`assignment ? slot_id`)
--    instead of testing the left join for a non-null id. Identical for real
--    logs -- an assigned id always joins -- but the hypothetical log has no
--    row in feed_logs, so the join cannot see it and a slot it claims would
--    otherwise report `due`/`missed` rather than `fed`, which is the exact
--    number log_feed counts.
--
-- 2. `hypothetical_in_window`: is the hypothetical timestamp inside THIS
--    slot's Grace Window? Null when no hypothetical is passed. log_feed needs
--    this to tell a snack (outside every window -- never warn) from a genuine
--    double feed whose nearby slots were all claimed by closer logs. Deriving
--    it here is what keeps `slot_at +/- grace` written once.
--
-- public.pet_slot_states keeps its two-argument signature and now names its
-- columns explicitly instead of `s.*`. The hypothetical is an internal concept
-- of the Double Feed guard; the PostgREST-exposed wrapper has no business
-- offering it, and an explicit list means adding a column in `private` can
-- never silently widen the public API.
--
-- Known limitation, deliberately not solved here: log_feed evaluates the local
-- day the log falls in. A Grace Window that crosses local midnight (a slot at
-- 00:30 with a 60-minute window, against a log at 23:50 the day before) is not
-- consulted from the adjacent day. Sweeping three days would double-count logs
-- assignable in two of them and buy accuracy no scheduled feed time in this
-- product has yet needed.

drop function if exists public.pet_slot_states(uuid, date);
drop function if exists private.slot_states(uuid, date);

create function private.slot_states(
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
  -- The hypothetical log's stand-in id. It never escapes to a caller:
  -- log_feed reads satisfying_log_id only from the run WITHOUT a hypothetical,
  -- and the public wrapper cannot pass one at all.
  hypothetical_log_id constant uuid := '00000000-0000-0000-0000-000000000001';
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
      union all
      -- The hypothetical competes on exactly the same terms as a real log: it
      -- can claim a slot, and it can lose one to a closer log.
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
      -- Reads the map, not the join: the hypothetical has no feed_logs row.
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

-- The wrapper is `security invoker`, NOT definer, so the selects inside run as
-- the calling user and the existing RLS on feed_logs and feeding_schedules
-- applies unchanged. A definer wrapper would expose any household's feeding
-- history to any authenticated user.

create function public.pet_slot_states(target_pet_id uuid, target_date date)
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
  select
    s.schedule_id,
    s.scheduled_time,
    s.label,
    s.scheduled_at,
    s.state,
    s.satisfying_log_id,
    s.satisfied_at,
    s.satisfied_by
  from private.slot_states(target_pet_id, target_date) as s;
$$;

-- Re-applied from 20260725090600: dropping a function drops its grants, and
-- every new function in `private` is born with the default PUBLIC EXECUTE that
-- migration explicitly revoked.
grant usage on schema private to authenticated, service_role;
grant execute on function private.slot_states(uuid, date, timestamptz) to authenticated, service_role;
grant execute on function public.pet_slot_states(uuid, date) to authenticated, service_role;

revoke execute on function public.pet_slot_states(uuid, date) from public, anon;
revoke execute on function private.slot_states(uuid, date, timestamptz) from public;
