-- Two fixes to private.sweep_missed_feeds found in the CRU-005 branch review.
-- The body is otherwise 20260730090000 verbatim.
--
-- create or replace preserves the ACL, so the revokes from that migration still
-- stand and are not repeated here.

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
    -- households.timezone is unconstrained text set by the client, so
    -- `now() at time zone` can raise. Without this block that raise unwinds the
    -- whole function and every household loses the run, not just the broken one.
    -- Costs a subtransaction per pet, which is affordable at this scale.
    begin
      -- created_at, not logged_at: the question is whether a human is still using
      -- the app, and someone backdating a log has just proved they are.
      select max(feed_logs.created_at) into last_log_created_at
      from public.feed_logs
      where feed_logs.pet_id = pet.pet_id;

      -- `error is null` counts alerts that were delivered or are still in
      -- flight, never ones that reached nobody. A fully muted household would
      -- otherwise burn its three nudges in silence, then get nothing when it
      -- turns alerts back on until someone logs a feed.
      select count(*) into nudges
      from public.alerts
      join public.feeding_schedules on feeding_schedules.id = alerts.subject_id
      where alerts.kind = 'missed_feed'
        and feeding_schedules.pet_id = pet.pet_id
        and alerts.error is null
        and (last_log_created_at is null or alerts.created_at > last_log_created_at);

      -- An `if` rather than the previous `continue`, so no jump crosses the
      -- exception block above it.
      if nudges < nudge_limit then
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
      end if;
    exception
      when others then
        -- The run itself must still succeed, or cron reports a failure that
        -- says nothing about which pet caused it.
        raise warning 'sweep_missed_feeds skipped pet %: %', pet.pet_id, sqlerrm;
    end;
  end loop;

  return inserted_total;
end $$;
