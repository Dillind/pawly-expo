-- CRU-187. A function name qualifies its parameters, not its declared
-- variables, so `sweep_reminders_due.occurrence_date` raised on every due
-- reminder and the handler swallowed it. No reminder_due alert was ever queued.

create or replace function private.sweep_reminders_due()
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
  due_on date;
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
      due_on := (now() at time zone reminder.timezone)::date + reminder.lead_days;

      if private.reminder_falls_on(reminder.starts_on, reminder.repeat, due_on) then
        send_at := (
          ((now() at time zone reminder.timezone)::date + reminder.local_time)
          at time zone reminder.timezone
        );

        -- Someone who ticks a reminder off early should not then be nudged
        -- about it. No lookback: a skipped run drops the nudge, as in sweep_feed_due.
        if send_at >= run_at
          and send_at < run_at + window_width
          and not exists (
            select 1
            from public.reminder_completions as completions
            where completions.reminder_id = reminder.id
              and completions.occurrence_date = due_on
          )
        then
          -- The predicate has to be repeated or Postgres will not infer the
          -- partial index as an arbiter -- 42P10, swallowed by the handler below.
          insert into public.alerts (household_id, kind, subject_id, subject_date)
          values (reminder.household_id, 'reminder_due', reminder.id, due_on)
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

revoke execute on function private.sweep_reminders_due() from public;
revoke execute on function private.sweep_reminders_due() from anon, authenticated;
