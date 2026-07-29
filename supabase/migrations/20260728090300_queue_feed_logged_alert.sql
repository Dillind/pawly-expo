-- Queue one alert per feed log. This runs inside log_feed's transaction, so a
-- rolled-back feed log queues no alert.
--
-- BACKDATING SUPPRESSION. feed_logs.logged_at is when the pet was ACTUALLY
-- fed, not when someone tapped Log -- the insert policy allows anything back
-- to now() - 24 hours (20260725090500). So this is an ordinary sequence: fed
-- at 7:05am, hands full, logged at 9pm. Without this rule every other member's
-- phone buzzes at 9pm with "Dylan fed Bailey - 7:05 am", which nobody can act
-- on, because Bailey was fed fourteen hours ago.
--
-- The value of a Feed Logged Alert is entirely "don't feed him again" -- it
-- exists to prevent the Double Feed. That value decays with the age of the
-- FEED, not of the log. 30 minutes is roughly the window in which a second
-- person is plausibly about to walk to the bowl, and is comfortably wider than
-- honest lag (feeding then logging two minutes later stays well inside). It is
-- a judgement, not a derivation.
--
-- A per-log "send a notification?" checkbox was considered and REJECTED. It
-- inverts control: every other layer (preference, permission) puts the choice
-- with the RECIPIENT, and a sender-side opt-out hands it to the person with
-- the least standing to make it. A considerate user ticks "don't notify", and
-- their partner feeds the dog an hour later -- reintroducing through the UI
-- the exact Double Feed PAW-002 built an RPC to prevent. It also puts a
-- decision inside the three-second logging loop PRODUCT_BRIEF protects.
--
-- The row is WRITTEN when suppressed, not skipped. A suppressed alert is a
-- real record of something that really happened; it simply should not have
-- interrupted anyone. Skipping it would also make "we chose not to interrupt
-- you" indistinguishable from "pg_net never fired" during verification.

create or replace function public.queue_feed_logged_alert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_household_id uuid;
begin
  select pets.household_id into target_household_id
  from public.pets
  where pets.id = new.pet_id;

  if target_household_id is null then
    return new;
  end if;

  insert into public.alerts (household_id, kind, subject_id, actor_id, suppressed_reason)
  values (
    target_household_id,
    'feed_logged',
    new.id,
    new.logged_by,
    case
      when new.logged_at < now() - interval '30 minutes' then 'backdated'
      else null
    end
  );

  return new;
end $$;

-- security definer because the caller has no grants on alerts at all (the
-- table revokes everything from authenticated). This function is the only way
-- an authenticated user causes an alerts row to exist, and it names no
-- caller-supplied table.

create trigger feed_logs_queue_alert
after insert on public.feed_logs
for each row
execute function public.queue_feed_logged_alert();
