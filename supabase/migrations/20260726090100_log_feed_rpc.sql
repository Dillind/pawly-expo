-- The one write path for a feed log. The client no longer inserts into
-- feed_logs directly, which makes the narrow column grants from
-- 20260725090300 moot rather than weakened -- the payload names no columns at
-- all.
--
-- The Double Feed check runs INSIDE the write, not before it. Check-then-
-- insert as two round trips was rejected: two people in one house both feeding
-- the dog at 6pm is not a hypothetical for this product -- it is the scenario
-- the feature exists for -- and a check that completes a full round trip
-- before its own insert can tell both of them "no double feed" and let both of
-- them write.
--
-- security invoker, so RLS remains the real gate. The feed_logs INSERT policy,
-- including the Contributor backdating floor and the Owner exemption, applies
-- unchanged, and a caller who is not a member of the pet's household cannot
-- even read the pet row that this function starts from.

create or replace function public.log_feed(
  target_pet_id uuid,
  target_logged_at timestamptz default now(),
  target_notes text default null,
  confirmed boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  household_timezone text;
  target_day date;
  is_double boolean;
  collision_label public.feeding_schedule_label;
  collision_time time;
  collision_log_id uuid;
  existing_log public.feed_logs%rowtype;
  new_log_id uuid;
begin
  select households.timezone into household_timezone
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  -- Not "pet does not exist" -- RLS on pets means a non-member reads no row,
  -- so the two cases are indistinguishable from here and must stay that way.
  if household_timezone is null then
    raise exception 'Pet not found' using errcode = '42501';
  end if;

  -- The local day the log falls in. See the limitation noted in
  -- 20260726090000: a Grace Window crossing local midnight is not consulted
  -- from the adjacent day.
  target_day := (target_logged_at at time zone household_timezone)::date;

  -- Logging at time T is a Double Feed if T falls inside at least one Grace
  -- Window AND adding it does not increase the number of satisfied slots that
  -- day. Both clauses are load-bearing: the first exempts snacks (a 3pm treat
  -- belongs to no slot and must never warn), the second is the actual test.
  --
  -- `<=` rather than `=`: a hypothetical can displace an existing log that
  -- then finds no other slot, which lowers the count. That is still a double
  -- feed -- the pet was fed at 6 and is about to be fed again.
  --
  -- Both CTEs are materialized so each runs the assignment exactly once
  -- despite being referenced twice.
  with without_hypothetical as materialized (
    select * from private.slot_states(target_pet_id, target_day)
  ),
  with_hypothetical as materialized (
    select * from private.slot_states(target_pet_id, target_day, target_logged_at)
  ),
  counts as (
    select
      (select count(*) from without_hypothetical where state = 'fed') as satisfied_without,
      (select count(*) from with_hypothetical where state = 'fed') as satisfied_with,
      (select coalesce(bool_or(hypothetical_in_window), false) from with_hypothetical) as in_window
  ),
  -- The slot to name in the warning: the nearest slot whose window contains T
  -- and which a REAL log already satisfies. Read from the run without the
  -- hypothetical on purpose -- in the displacement case the hypothetical has
  -- taken the slot in the other run, and the log it displaced is exactly the
  -- one the user needs to be told about.
  collision as (
    select w.label, w.scheduled_time, b.satisfying_log_id
    from with_hypothetical w
    join without_hypothetical b on b.schedule_id = w.schedule_id
    where w.hypothetical_in_window and b.state = 'fed'
    order by abs(extract(epoch from (target_logged_at - w.scheduled_at))) asc
    limit 1
  )
  select
    counts.in_window and counts.satisfied_with <= counts.satisfied_without,
    collision.label,
    collision.scheduled_time,
    collision.satisfying_log_id
  into is_double, collision_label, collision_time, collision_log_id
  from counts left join collision on true;

  -- A warning with nothing to point at is worse than no warning: it accuses
  -- the user of repeating a feed it cannot show them. Write instead.
  if is_double and collision_log_id is not null and not confirmed then
    select * into existing_log from public.feed_logs where id = collision_log_id;

    return jsonb_build_object(
      'status', 'double_feed',
      'slot', jsonb_build_object(
        'label', collision_label,
        'scheduled_time', collision_time
      ),
      'existing', jsonb_build_object(
        'id', existing_log.id,
        'logged_at', existing_log.logged_at,
        'logged_by', existing_log.logged_by
      )
    );
  end if;

  -- Nothing above this line writes. A second call with confirmed => true
  -- reaches here unconditionally.
  insert into public.feed_logs (pet_id, logged_by, logged_at, notes)
  values (
    target_pet_id,
    (select auth.uid()),
    target_logged_at,
    nullif(btrim(target_notes), '')
  )
  returning id into new_log_id;

  return jsonb_build_object('status', 'logged', 'log_id', new_log_id);
end;
$$;

revoke execute on function public.log_feed(uuid, timestamptz, text, boolean) from public, anon;
grant execute on function public.log_feed(uuid, timestamptz, text, boolean) to authenticated;
