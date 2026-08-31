-- Fifteen minutes, matching the window in sweep_reminders_due. A Lead Day is
-- days, so the five-minute cadence the feed nudge needs would only cost runs.
--
-- Unschedule first so this stays re-runnable against a hand-created job.
select cron.unschedule('sweep-reminders-due')
where exists (select 1 from cron.job where jobname = 'sweep-reminders-due');

select cron.schedule(
  'sweep-reminders-due',
  '*/15 * * * *',
  $$select private.sweep_reminders_due()$$
);
