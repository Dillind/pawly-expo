-- Missed-feed detection. See ADR 0013 for why this is a sweep and not an Edge
-- Function, and CONTEXT.md for the Nudge Limit.
--
-- The lookback exists so the first run does not alert every slot every
-- household has ever missed. Its cost is that a sweep outage loses those
-- alerts, which is accepted: a nudge about breakfast is worthless by lunch.

create or replace function private.sweep_missed_feeds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  nudge_limit constant integer := 3;
  lookback constant interval := interval '30 minutes';
  inserted_total integer := 0;
  row_inserted integer;
  nudges integer;
  last_log_created_at timestamptz;
  local_date date;
  pet record;
  slot record;
begin
  for pet in
    select
      pets.id as pet_id,
      pets.household_id,
      households.timezone,
      make_interval(mins => households.grace_window_minutes) as grace
    from public.pets
    join public.households on households.id = pets.household_id
  loop
    -- created_at, not logged_at: the question is whether a human is still using
    -- the app, and someone backdating a log has just proved they are.
    select max(feed_logs.created_at) into last_log_created_at
    from public.feed_logs
    where feed_logs.pet_id = pet.pet_id;

    select count(*) into nudges
    from public.alerts
    join public.feeding_schedules on feeding_schedules.id = alerts.subject_id
    where alerts.kind = 'missed_feed'
      and feeding_schedules.pet_id = pet.pet_id
      and (last_log_created_at is null or alerts.created_at > last_log_created_at);

    if nudges >= nudge_limit then
      continue;
    end if;

    -- Yesterday too: a late-evening slot's window can close after local midnight.
    foreach local_date in array array[
      (now() at time zone pet.timezone)::date - 1,
      (now() at time zone pet.timezone)::date
    ]
    loop
      for slot in
        select states.schedule_id, states.scheduled_at
        from private.slot_states(pet.pet_id, local_date) as states
        where states.state = 'missed'
        order by states.scheduled_at asc
      loop
        if slot.scheduled_at + pet.grace < now() - lookback then
          continue;
        end if;

        -- on conflict is what makes the 15-minute cadence safe.
        insert into public.alerts (household_id, kind, subject_id, subject_date)
        values (pet.household_id, 'missed_feed', slot.schedule_id, local_date)
        on conflict (kind, subject_id, subject_date) do nothing;

        get diagnostics row_inserted = row_count;

        if row_inserted = 1 then
          nudges := nudges + 1;
          inserted_total := inserted_total + 1;

          -- Counted as we insert, so a pet at 2 cannot land at 5 in one run.
          exit when nudges >= nudge_limit;
        end if;
      end loop;

      exit when nudges >= nudge_limit;
    end loop;
  end loop;

  return inserted_total;
end $$;

-- Born with PUBLIC EXECUTE, and never granted to authenticated: no client calls this.
revoke execute on function private.sweep_missed_feeds() from public;
revoke execute on function private.sweep_missed_feeds() from anon, authenticated;
