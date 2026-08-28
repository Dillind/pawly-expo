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
  -- The five-minute bin the run belongs to, NOT now(). cron fires at 16:45:00
  -- and now() is a fraction of a second later, so a 5:00 pm feed with a
  -- 15-minute lead has a send time of exactly 16:45:00 -- already in the past
  -- by the time the function reads the clock. Compared against now() that feed
  -- is skipped on this run and every run after, which silently loses the nudge
  -- for every feed time on the hour. Binning is what makes the boundary case
  -- the common case it actually is.
  run_at constant timestamptz := pg_catalog.date_bin(
    interval '5 minutes', pg_catalog.now(), pg_catalog.timestamptz '2000-01-01 00:00:00+00'
  );
  inserted_total integer := 0;
  row_inserted integer;
  send_at timestamptz;
  local_date date;
  pet record;
  occurrence record;
  lead smallint;
begin
  for pet in
    select
      pets.id as pet_id,
      pets.household_id,
      households.timezone,
      -- The cohorts this household actually holds. Read once per pet rather
      -- than once per occurrence: it is a property of the household, and the
      -- inner loops run it twice a day per feed time otherwise. A null array
      -- means nobody here wants a nudge, so there is nothing to queue.
      (
        select pg_catalog.array_agg(distinct members.feed_due_lead_minutes)
        from public.household_members as members
        where members.household_id = pets.household_id
          and members.feed_due_alerts
      ) as leads
    from public.pets
    join public.households on households.id = pets.household_id
  loop
    continue when pet.leads is null;

    -- households.timezone is unconstrained text set by the client, so
    -- `at time zone` can raise. Without this block that raise unwinds the whole
    -- function and every household loses the run, not just the broken one.
    -- `when others` is deliberately wide, as in sweep_missed_feeds: whatever
    -- breaks for one pet, the rest of the run must still happen.
    begin
      -- Tomorrow too: a 00:30 feed with a 60-minute lead sends at 23:30 the
      -- day before. The missed sweep reads yesterday for the mirror reason.
      foreach local_date in array array[
        (now() at time zone pet.timezone)::date,
        (now() at time zone pet.timezone)::date + 1
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
          -- One cohort per lead time. A lead time nobody chose would queue a
          -- row that resolves to no recipients and pushes nothing.
          foreach lead in array pet.leads
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
