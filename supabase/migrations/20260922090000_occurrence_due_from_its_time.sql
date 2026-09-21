-- The pre-window was left over from slot_states matching early logs, which ADR 0029 removed (#114).
create or replace function private.occurrence_states(target_pet_id uuid, target_date date)
returns table (
  series_id         uuid,
  local_time        time,
  label             public.feeding_schedule_label,
  instructions      text,
  scheduled_at      timestamptz,
  state             text,
  satisfying_log_id uuid,
  satisfied_at      timestamptz,
  satisfied_by      uuid
)
language plpgsql
security invoker
set search_path = ''
stable
as $$
declare
  household_timezone text;
  grace interval;
begin
  select households.timezone, make_interval(mins => households.grace_window_minutes)
    into household_timezone, grace
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  if household_timezone is null then
    return;
  end if;

  return query
  with occurrences as (
    select
      feed_occurrences.series_id,
      feed_occurrences.label,
      feed_occurrences.local_time,
      feed_occurrences.instructions,
      ((target_date + feed_occurrences.local_time) at time zone household_timezone) as occurrence_at
    from private.feed_occurrences(target_pet_id, target_date) as feed_occurrences
  )
  select
    occurrences.series_id,
    occurrences.local_time,
    occurrences.label,
    occurrences.instructions,
    occurrences.occurrence_at,
    case
      when matched.id is not null then 'fed'
      when now() < occurrences.occurrence_at then 'upcoming'
      when now() <= occurrences.occurrence_at + grace then 'due'
      else 'missed'
    end,
    matched.id,
    matched.logged_at,
    matched.logged_by
  from occurrences
  left join public.feed_logs as matched
    on matched.feed_time_series_id = occurrences.series_id
   and matched.occurrence_date = target_date
  order by occurrences.occurrence_at asc;
end;
$$;

create or replace function public.pet_occurrence_states(target_pet_id uuid, target_date date)
returns table (
  series_id         uuid,
  local_time        time,
  label             public.feeding_schedule_label,
  instructions      text,
