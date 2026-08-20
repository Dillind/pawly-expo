-- Phase 4 of CRU-066, second half.
--
-- Held back from 20260820090300 deliberately. A build already installed on a
-- device still calls pet_slot_states, and this migration is the moment that
-- build stops working. Apply it when the app is rebuilt, not before.

-- Nothing reads these now.

drop function if exists public.pet_slot_states(uuid, date);
drop function if exists private.slot_states(uuid, date, timestamptz);
drop table if exists public.feeding_schedules;
