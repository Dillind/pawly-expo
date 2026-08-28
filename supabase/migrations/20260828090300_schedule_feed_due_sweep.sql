-- Five minutes, not fifteen: every lead time divides by five, so this cadence
-- is what makes a boundary feed time exact.
--
-- Unschedule first so this stays re-runnable against a hand-created job.
select cron.unschedule('sweep-feed-due')
where exists (select 1 from cron.job where jobname = 'sweep-feed-due');

select cron.schedule(
  'sweep-feed-due',
  '*/5 * * * *',
  $$select private.sweep_feed_due()$$
);
