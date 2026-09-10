-- Two reads that RLS cannot serve, so both are definer functions.
--
-- A stranger who opens a follow link is neither member nor follower, so
-- can_read_household is false for them and they can see neither the name nor
-- the pets the landing screen has to show. And a PENDING follower is in the
-- same position: the Following list must name a household that has not
-- accepted them yet.
--
-- Widening can_read_household to cover 'pending' would fix both and is the
-- wrong fix -- that predicate also guards posts. These two return exactly what
-- the two screens draw and nothing else.

-- Name, pet count and the pets, plus where the caller stands.
--
-- 'blocked' is deliberately reported as 'none': a removed person sees the same
-- screen as anyone else and their next request goes nowhere, which is what
-- request_follow already does.
create or replace function public.follow_preview(target_household_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  household public.households;
  relationship text;
  pet_rows jsonb;
begin
  select * into household from public.households where id = target_household_id;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if private.is_household_member(target_household_id) then
    relationship := 'member';
  else
    select case when f.status = 'accepted' then 'accepted'
                when f.status = 'pending' then 'pending'
                else 'none' end
      into relationship
    from public.household_follows f
    where f.household_id = target_household_id
      and f.follower_id = auth.uid();

    relationship := coalesce(relationship, 'none');
  end if;

  -- Name and breed only. A photo is public on the bucket already, and the
  -- landing screen draws the paw placeholder without one.
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id, 'name', p.name, 'breed', p.breed, 'photo_url', p.photo_url
         ) order by p.name), '[]'::jsonb)
    into pet_rows
  from public.pets p
  where p.household_id = target_household_id;

  return jsonb_build_object(
    'status', relationship,
    'household_id', household.id,
    'name', household.name,
    'pets', pet_rows
  );
end $$;

revoke execute on function public.follow_preview(uuid) from public, anon;
grant execute on function public.follow_preview(uuid) to authenticated;

-- The caller's own Following list, pending rows included.
create or replace function public.list_following()
returns table (
  household_id uuid,
  name text,
  pet_count integer,
  status public.follow_status,
  requested_at timestamptz
)
language sql
security definer
set search_path = ''
stable
as $$
  select h.id,
         h.name,
         (select count(*)::integer from public.pets p where p.household_id = h.id),
         f.status,
         f.requested_at
  from public.household_follows f
  join public.households h on h.id = f.household_id
  where f.follower_id = auth.uid()
    and f.status in ('pending', 'accepted')
  order by h.name;
$$;

revoke execute on function public.list_following() from public, anon;
grant execute on function public.list_following() to authenticated;
