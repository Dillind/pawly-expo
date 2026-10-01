\set QUIET on
\set ON_ERROR_STOP on
\pset pager off

-- The sweep catches errors per reminder, so a broken query looks like a quiet day.
-- CRU-187 sent no pushes for a month that way. Needs no seed and is re-runnable.

create or replace function pg_temp.check(label text, got anyelement, want anyelement)
returns void language plpgsql as $$
begin
  if got is not distinct from want then
    raise notice 'PASS  %', label;
  else
    raise exception 'FAIL  % -- got %, want %', label, got, want;
  end if;
end $$;

insert into auth.users (id) values ('55555555-5555-5555-5555-555555555555')
  on conflict (id) do nothing;
insert into public.households (id, name, timezone)
  values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Reminder Household', 'Australia/Brisbane')
  on conflict (id) do nothing;
insert into public.pets (id, household_id, name)
  values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Toby')
  on conflict (id) do nothing;

delete from public.alerts where household_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
drop table if exists slot;
delete from public.reminders where pet_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

-- A table, not a view: a view reads now() again on every query. Each push is due
-- in this run's bin, at the household's own time, unless the row says otherwise.
create temp table slot as
select
  (bin at time zone 'Australia/Brisbane')::date as local_day,
  (bin at time zone 'Australia/Brisbane')::time as local_time
from (
  select date_bin(interval '15 minutes', now(), timestamptz '2000-01-01 00:00:00+00') as bin
) as run;

insert into public.reminders (id, pet_id, title, kind, starts_on, local_time, lead_days, created_by, deleted_at)
select id::uuid, 'ffffffff-ffff-ffff-ffff-ffffffffffff', title, 'medication',
  slot.local_day + lead, slot.local_time + shift, lead,
  '55555555-5555-5555-5555-555555555555', deleted
from slot, (values
  ('10000000-0000-0000-0000-000000000001', 'Due now',        1, interval '0',  null::timestamptz),
  ('10000000-0000-0000-0000-000000000002', 'Due in 3 days',  3, interval '0',  null),
  ('10000000-0000-0000-0000-000000000003', 'Ticked off',     1, interval '0',  null),
  ('10000000-0000-0000-0000-000000000004', 'Later today',    1, interval '1 hour', null),
  ('10000000-0000-0000-0000-000000000005', 'Deleted',        1, interval '0',  now())
) as rows (id, title, lead, shift, deleted);

insert into public.reminder_completions (reminder_id, occurrence_date, done_by)
select '10000000-0000-0000-0000-000000000003', slot.local_day + 1,
  '55555555-5555-5555-5555-555555555555'
from slot;

-- Counted in this household only: the sweep scans every reminder in the database.
select private.sweep_reminders_due();

select pg_temp.check('the sweep queues the two due reminders',
  (select count(*)::int from public.alerts
    where household_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'), 2);

select pg_temp.check('a 1-day reminder is queued for its due date, not today',
  (select subject_date from public.alerts
    where subject_id = '10000000-0000-0000-0000-000000000001'),
  (select local_day + 1 from slot));

select pg_temp.check('a 3-day reminder is queued for its due date',
  (select subject_date from public.alerts
    where subject_id = '10000000-0000-0000-0000-000000000002'),
  (select local_day + 3 from slot));

select pg_temp.check('it is queued for the household, as household news',
  (select household_id::text || coalesce(recipient_id::text, '') from public.alerts
    where subject_id = '10000000-0000-0000-0000-000000000001'),
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee');

select pg_temp.check('a reminder ticked off early is not pushed',
  (select count(*)::int from public.alerts
    where subject_id = '10000000-0000-0000-0000-000000000003'), 0);

select pg_temp.check('a reminder due at another time is not pushed yet',
  (select count(*)::int from public.alerts
    where subject_id = '10000000-0000-0000-0000-000000000004'), 0);

select pg_temp.check('a deleted reminder is not pushed',
  (select count(*)::int from public.alerts
    where subject_id = '10000000-0000-0000-0000-000000000005'), 0);

select private.sweep_reminders_due();

select pg_temp.check('a second run in the same bin queues nothing more',
  (select count(*)::int from public.alerts
    where household_id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'), 2);
