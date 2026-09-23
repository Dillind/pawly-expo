-- Only an Owner can follow, and only as a Household they own. See ADR 0044.

create or replace function public.request_follow(
  target_household_id uuid,
  named_household_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.household_follows;
  owned_ids uuid[];
begin
  if not exists (select 1 from public.households where id = target_household_id) then
    return jsonb_build_object('status', 'not_found');
  end if;

  if private.is_household_member(target_household_id) then
    return jsonb_build_object('status', 'already_member');
  end if;

  select * into existing
  from public.household_follows
  where household_id = target_household_id
    and follower_id = auth.uid();

  if found then
    if existing.status = 'removed' then
      return jsonb_build_object('status', 'blocked');
    end if;

    return jsonb_build_object('status', existing.status::text, 'id', existing.id);
  end if;

  select coalesce(array_agg(distinct named.id), '{}') into owned_ids
  from unnest(named_household_ids) as named(id)
  where named.id <> target_household_id
    and private.is_household_owner(named.id);

  if cardinality(owned_ids) = 0 then
    return jsonb_build_object('status', 'no_household');
  end if;

  insert into public.household_follows (household_id, follower_id)
  values (target_household_id, auth.uid())
  returning * into existing;

  insert into public.follow_named_households (follow_id, household_id)
  select existing.id, unnest(owned_ids);

  return jsonb_build_object('status', 'pending', 'id', existing.id);
end $$;
