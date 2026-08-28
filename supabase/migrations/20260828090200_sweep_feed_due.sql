-- The nudge that comes before the failure. See ADR 0033.
--
-- Its own function and its own job, separate from sweep_missed_feeds: the two
-- run at different cadences, read different local dates, and answer different
-- questions. Sharing one loop would tie a five-minute nudge to a fifteen-minute
-- accusation for no gain.

create function private.sweep_feed_due()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Matches the cron cadence. All four lead times divide by five, so a feed
  -- time on a five-minute boundary is exact and one at 5:07 pm is up to five
  -- minutes early. Early is right; a nudge that lands after the moment it was
  -- for is an insult.
  window_width constant interval := interval '5 minutes';
  run_at constant timestamptz := now();
  inserted_total integer := 0;
  row_inserted integer;
  send_at timestamptz;
  local_date date;
  pet record;
  occurrence record;
  lead smallint;
begin
  for pet in
    select pets.id as pet_id, pets.household_id, households.timezone
    from public.pets
    join public.households on households.id = pets.household_id
  loop
    -- households.timezone is unconstrained text set by the client, so
    -- `at time zone` can raise. Without this block that raise unwinds the whole
    -- function and every household loses the run, not just the broken one.
    begin
      -- Tomorrow too: a 00:30 feed with a 60-minute lead sends at 23:30 the
      -- day before. The missed sweep reads yesterday for the mirror reason.
      foreach local_date in array array[
        (run_at at time zone pet.timezone)::date,
        (run_at at time zone pet.timezone)::date + 1
      ]
      loop
        for occurrence in
          select states.scheduled_at
          from private.occurrence_states(pet.pet_id, local_date) as states
          -- No Satisfying Feed. state is not consulted: a 60-minute Grace
          -- Window makes a 5:00 pm feed read `due` from 4:00 pm, which says
          -- nothing about whether it still needs nudging.
          where states.satisfying_log_id is null
        loop
          -- One cohort per lead time a member of this household actually holds.
          -- A lead time nobody chose would queue a row that resolves to no
          -- recipients and pushes nothing.
          for lead in
            select distinct members.feed_due_lead_minutes
            from public.household_members as members
            where members.household_id = pet.household_id
              and members.feed_due_alerts
          loop
            send_at := occurrence.scheduled_at - pg_catalog.make_interval(mins => lead);

            -- No lookback, unlike the missed sweep. A skipped run drops the
            -- nudge, because a stale "coming up" is worse than silence.
            continue when send_at < run_at or send_at >= run_at + window_width;

            -- subject_id is the household, not the pet: one push covers every
            -- pet due at this instant. The second pet conflicts here and is
            -- named at send time instead, when the Edge Function rebuilds the
            -- set from occurrence_states.
            insert into public.alerts
              (household_id, kind, subject_id, subject_date, lead_minutes, subject_at)
            values
              (pet.household_id, 'feed_due', pet.household_id, local_date, lead,
               occurrence.scheduled_at)
            on conflict (kind, subject_id, subject_date, lead_minutes, subject_at)
              where kind = 'feed_due'
              do nothing;

            get diagnostics row_inserted = row_count;
            inserted_total := inserted_total + row_inserted;
          end loop;
        end loop;
      end loop;
    exception
      when others then
        raise warning 'sweep_feed_due skipped pet %: %', pet.pet_id, sqlerrm;
    end;
  end loop;

  return inserted_total;
end;
$$;

-- Born with PUBLIC EXECUTE, and never granted to authenticated: no client calls this.
revoke execute on function private.sweep_feed_due() from public;
revoke execute on function private.sweep_feed_due() from anon, authenticated;
