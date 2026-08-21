-- The feed times the editor shows: the version in effect from tomorrow, one
-- per series. "Tomorrow" is a local date in the household's timezone, which is
-- why this is an RPC and not a PostgREST filter -- the client must not compute
-- it (ADR 0009), and `upper(effective) is null` is not expressible over REST.

create function public.pet_feed_times(target_pet_id uuid)
returns table (
  series_id    uuid,
  label        public.feeding_schedule_label,
  local_time   time,
  days_of_week smallint[],
  instructions text
)
language sql
security invoker
set search_path = ''
stable
as $$
  select
    feed_times.series_id,
    feed_times.label,
    feed_times.local_time,
    feed_times.days_of_week,
    feed_times.instructions
  from public.feed_times
  where feed_times.pet_id = target_pet_id
    and upper(feed_times.effective) is null
  order by feed_times.local_time asc;
$$;

revoke execute on function public.pet_feed_times(uuid) from public, anon;
grant execute on function public.pet_feed_times(uuid) to authenticated, service_role;
