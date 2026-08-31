-- CRU-078. The nudge for a Reminder, on its own job.
--
-- Separate from sweep_feed_due for the same reason that one is separate from
-- sweep_missed_feeds: different cadence, different question. A Lead Day is
-- measured in days, so this runs every 15 minutes rather than every 5 -- the
-- precision a feed nudge needs buys nothing here.

create function private.sweep_reminders_due()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  window_width constant interval := interval '15 minutes';
  -- The bin the run belongs to, not now(). Same trap as sweep_feed_due: cron
  -- fires at 09:30:00 and now() is a fraction later, so a reminder set for
  -- exactly 9:30am would be behind the clock on every run and never sent.
  run_at constant timestamptz := pg_catalog.date_bin(
    interval '15 minutes', pg_catalog.now(), pg_catalog.timestamptz '2000-01-01 00:00:00+00'
  );
  inserted_total integer := 0;
  row_inserted integer;
  send_at timestamptz;
  occurrence_date date;
  reminder record;
begin
  for reminder in
    select
      reminders.id,
      reminders.pet_id,
      reminders.starts_on,
      reminders.repeat,
      reminders.local_time,
      reminders.lead_days,
      pets.household_id,
      households.timezone
    from public.reminders
    join public.pets on pets.id = reminders.pet_id
    join public.households on households.id = pets.household_id
    where reminders.deleted_at is null
  loop
    -- households.timezone is unconstrained text set by the client, so
    -- `at time zone` can raise. One broken household must not cost the run.
    begin
      -- The nudge goes out lead_days before the occurrence, at the Reminder's
      -- own local time. So the only date this run can be about is today plus
      -- the lead.
      occurrence_date := (now() at time zone reminder.timezone)::date + reminder.lead_days;

      if private.reminder_falls_on(
        reminder.starts_on, reminder.repeat, occurrence_date
      ) then

        -- The Reminder's own local time, on the day the nudge goes out.
        send_at := (
          ((now() at time zone reminder.timezone)::date + reminder.local_time)
          at time zone reminder.timezone
        );

        -- Already dealt with. Someone who ticks a reminder off early should not
        -- then be nudged about it. No lookback either: a skipped run drops this
        -- nudge rather than sending a stale one, as sweep_feed_due decided.
        if send_at >= run_at
          and send_at < run_at + window_width
          and not exists (
            select 1
            from public.reminder_completions as completions
            where completions.reminder_id = reminder.id
              and completions.occurrence_date = sweep_reminders_due.occurrence_date
          )
        then
          -- subject_id is the Reminder and subject_date is the occurrence, so
          -- the table-wide idempotency index already keys this correctly. The
          -- predicate has to be repeated or Postgres will not infer the partial
          -- index as an arbiter -- 42P10, swallowed by the handler below.
          insert into public.alerts (household_id, kind, subject_id, subject_date)
          values (reminder.household_id, 'reminder_due', reminder.id, occurrence_date)
          on conflict (kind, subject_id, subject_date)
            where kind <> 'feed_due'
            do nothing;

          get diagnostics row_inserted = row_count;
          inserted_total := inserted_total + row_inserted;
        end if;
      end if;
    exception
      when others then
        raise warning 'sweep_reminders_due skipped reminder %: %', reminder.id, sqlerrm;
    end;
  end loop;

  return inserted_total;
end;
$$;

-- Born with PUBLIC EXECUTE, and never granted to authenticated: no client calls this.
revoke execute on function private.sweep_reminders_due() from public;
revoke execute on function private.sweep_reminders_due() from anon, authenticated;
