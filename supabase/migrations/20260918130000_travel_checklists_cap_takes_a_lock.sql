-- Two Owners inserting into an empty free Household at once both saw no row.
-- The per-Household lock serialises them, the way log_feed does per Pet.
create or replace function private.enforce_checklist_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_household_pro(new.household_id) then
    return new;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.household_id::text, 0));

  if exists (
    select 1 from public.travel_checklists where household_id = new.household_id
  ) then
    raise exception 'checklist_cap_reached' using errcode = 'P0001';
  end if;

  return new;
end $$;
