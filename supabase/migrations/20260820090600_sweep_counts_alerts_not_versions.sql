-- The nudge counter joined alerts to feed_times on series_id, which is not
-- unique -- that is the whole point of versioning. One alert therefore counted
-- once per version of its series, so a household whose owner had edited dinner
-- twice hit the three-nudge limit on its first missed feed and was never nudged
-- again until someone logged.
--
-- The old join was on feeding_schedules.id, a primary key, so it was 1:1 and
-- the bug did not exist before this ticket.

create or replace function private.sweep_missed_feeds()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  nudge_limit constant integer := 3;
  lookback constant interval := interval '30 minutes';
  inserted_total integer := 0;
  row_inserted integer;
  nudges integer;
  last_log_created_at timestamptz;
  local_date date;
  pet record;
  occurrence record;
begin
  for pet in
    select
      pets.id as pet_id,
      pets.household_id,
      households.timezone,
      make_interval(mins => households.grace_window_minutes) as grace
    from public.pets
    join public.households on households.id = pets.household_id
  loop
    -- households.timezone is unconstrained text set by the client, so
    -- `now() at time zone` can raise. Without this block that raise unwinds the
    -- whole function and every household loses the run, not just the broken one.
    begin
      -- created_at, not logged_at: the question is whether a human is still using
      -- the app, and someone backdating a log has just proved they are.
      select max(feed_logs.created_at) into last_log_created_at
      from public.feed_logs
      where feed_logs.pet_id = pet.pet_id;

      -- `exists`, not a join: one alert must count once however many versions
      -- its series has. `error is null` counts alerts that were delivered or are
      -- still in flight, never ones that reached nobody -- a fully muted
      -- household would otherwise burn its three nudges in silence.
      select count(*) into nudges
      from public.alerts
      where alerts.kind = 'missed_feed'
        and alerts.error is null
        and (last_log_created_at is null or alerts.created_at > last_log_created_at)
        and exists (
          select 1
          from public.feed_times
          where feed_times.series_id = alerts.subject_id
            and feed_times.pet_id = pet.pet_id
        );

      if nudges < nudge_limit then
        -- Yesterday too: a late-evening window can close after local midnight.
        foreach local_date in array array[
          (now() at time zone pet.timezone)::date - 1,
          (now() at time zone pet.timezone)::date
        ]
        loop
          for occurrence in
            select states.series_id, states.scheduled_at
            from private.occurrence_states(pet.pet_id, local_date) as states
            where states.state = 'missed'
            order by states.scheduled_at asc
          loop
            if occurrence.scheduled_at + pet.grace < now() - lookback then
              continue;
            end if;

            -- on conflict is what makes the 15-minute cadence safe.
            insert into public.alerts (household_id, kind, subject_id, subject_date)
            values (pet.household_id, 'missed_feed', occurrence.series_id, local_date)
            on conflict (kind, subject_id, subject_date) do nothing;

            get diagnostics row_inserted = row_count;

            if row_inserted = 1 then
              nudges := nudges + 1;
              inserted_total := inserted_total + 1;

              -- Counted as we insert, so a pet at 2 cannot land at 5 in one run.
              exit when nudges >= nudge_limit;
            end if;
          end loop;

          exit when nudges >= nudge_limit;
        end loop;
      end if;
    exception
      when others then
        raise warning 'sweep_missed_feeds skipped pet %: %', pet.pet_id, sqlerrm;
    end;
  end loop;

  return inserted_total;
end;
$$;

-- log_feed took the series on trust. Nothing checked that the occurrence being
-- named belongs to the pet being fed, so a client bug -- or a hand-made RPC
-- call -- could file one pet's log against another pet's occurrence and mark
-- that pet fed.

create or replace function public.log_feed(
  target_pet_id uuid,
  target_logged_at timestamptz default now(),
  target_notes text default null,
  confirmed boolean default false,
  target_series_id uuid default null,
  target_occurrence_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  household_timezone text;
  existing_log public.feed_logs%rowtype;
  occurrence_label public.feeding_schedule_label;
  occurrence_time time;
  new_log_id uuid;
  write_series_id uuid := target_series_id;
  write_occurrence_date date := target_occurrence_date;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_pet_id::text, 0));

  select households.timezone into household_timezone
  from public.pets
  join public.households on households.id = pets.household_id
  where pets.id = target_pet_id;

  -- Not "pet does not exist" -- RLS on pets means a non-member reads no row,
  -- so the two cases are indistinguishable from here and must stay that way.
  if household_timezone is null then
    raise exception 'Pet not found' using errcode = '42501';
  end if;

  if (target_series_id is null) <> (target_occurrence_date is null) then
    raise exception 'An occurrence needs both a series and a date'
      using errcode = '22023';
  end if;

  if target_series_id is not null then
    if not exists (
      select 1
      from public.feed_times
      where feed_times.series_id = target_series_id
        and feed_times.pet_id = target_pet_id
        and feed_times.effective @> target_occurrence_date
    ) then
      raise exception 'That feed does not belong to this pet on that day'
        using errcode = '22023';
    end if;

    select * into existing_log
    from public.feed_logs
    where feed_logs.feed_time_series_id = target_series_id
      and feed_logs.occurrence_date = target_occurrence_date;

    if found and not confirmed then
      select feed_times.label, feed_times.local_time
        into occurrence_label, occurrence_time
      from public.feed_times
      where feed_times.series_id = target_series_id
        and feed_times.effective @> target_occurrence_date;

      return jsonb_build_object(
        'status', 'double_feed',
        'occurrence', jsonb_build_object(
          'series_id', target_series_id,
          'occurrence_date', target_occurrence_date,
          'label', occurrence_label,
          'local_time', occurrence_time
        ),
        'existing', jsonb_build_object(
          'id', existing_log.id,
          'logged_at', existing_log.logged_at,
          'logged_by', existing_log.logged_by
        )
      );
    end if;

    -- A confirmed second feed against an already-satisfied occurrence is
    -- written as an Extra Feed. The pet really was fed again, so the log has to
    -- exist; the occurrence is already satisfied, so it satisfies nothing.
    if found then
      write_series_id := null;
      write_occurrence_date := null;
    end if;
  end if;

  insert into public.feed_logs
    (pet_id, logged_by, logged_at, notes, feed_time_series_id, occurrence_date)
  values (
    target_pet_id,
    (select auth.uid()),
    target_logged_at,
    nullif(btrim(target_notes), ''),
    write_series_id,
    write_occurrence_date
  )
  returning id into new_log_id;

  return jsonb_build_object(
    'status', 'logged',
    'log_id', new_log_id,
    'is_extra_feed', write_series_id is null
  );
end;
$$;
