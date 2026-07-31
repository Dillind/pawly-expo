-- The 15-minute cadence bounds alert latency; the sweep's 30-minute lookback is
-- two intervals wide so one skipped run still catches up.

create extension if not exists pg_cron;

-- Unschedule first so this stays re-runnable against a hand-created job.
select cron.unschedule('sweep-missed-feeds')
where exists (select 1 from cron.job where jobname = 'sweep-missed-feeds');

select cron.schedule(
  'sweep-missed-feeds',
  '*/15 * * * *',
  $$select private.sweep_missed_feeds()$$
);
