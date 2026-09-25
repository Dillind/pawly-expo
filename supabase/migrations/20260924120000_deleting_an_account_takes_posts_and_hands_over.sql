-- CRU-156, after review. ADR 0045 has the reasoning.
-- A deleted account's posts and comments now go with it. Their photos are
-- returned for the Edge Function, because Postgres cannot delete from storage.

alter table public.posts
  drop constraint posts_author_id_fkey,
  add constraint posts_author_id_fkey
    foreign key (author_id) references public.users (id) on delete cascade;

alter table public.post_comments
  drop constraint post_comments_author_id_fkey,
  add constraint post_comments_author_id_fkey
    foreign key (author_id) references public.users (id) on delete cascade;

drop function if exists public.account_deletion_blockers();

create or replace function public.account_deletion_plan()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(jsonb_agg(plan order by plan ->> 'name'), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', h.id,
      'name', h.name,
      'outcome', case
        when not exists (
          select 1 from public.household_members other
          where other.household_id = h.id and other.user_id <> m.user_id
        ) then 'deleted'
        when m.role = 'owner' and private.owner_count(h.id) <= 1 then 'choose'
        else 'leave'
      end,
      'members', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'user_id', other.user_id,
            'first_name', u.first_name,
            'role', other.role,
            'joined_at', other.created_at
          )
          order by other.created_at
        )
        from public.household_members other
        join public.users u on u.id = other.user_id
        where other.household_id = h.id and other.user_id <> m.user_id
      ), '[]'::jsonb)
    ) as plan
    from public.household_members m
    join public.households h on h.id = m.household_id
    where m.user_id = (select auth.uid())
  ) plans;
$$;

revoke execute on function public.account_deletion_plan() from public, anon;
grant execute on function public.account_deletion_plan() to authenticated;

-- The new Owner inherits a Household they did not choose to show in public.
create or replace function public.hand_over_household(
  target_household_id uuid,
  successor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  result := public.set_member_role(target_household_id, successor_id, 'owner');

  if result ->> 'status' not in ('changed', 'unchanged') then
    return result;
  end if;

  update public.households set is_listed = false where id = target_household_id;

  return jsonb_build_object('status', 'handed_over');
end;
$$;

revoke execute on function public.hand_over_household(uuid, uuid) from public, anon;
grant execute on function public.hand_over_household(uuid, uuid) to authenticated;

drop function if exists public.prepare_account_deletion(uuid);

create or replace function public.prepare_account_deletion(
  target_user_id uuid,
  households_to_delete uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  blockers jsonb;
  doomed_ids uuid[];
  pet_names text[];
  post_names text[];
begin
  perform 1
  from public.households h
  join public.household_members m on m.household_id = h.id
  where m.user_id = target_user_id
  order by h.id
  for update of h;

  -- A Household may be named for deletion only by its one Owner.
  select coalesce(array_agg(m.household_id), '{}')
  into doomed_ids
  from public.household_members m
  where m.user_id = target_user_id
    and (
      not exists (
        select 1 from public.household_members other
        where other.household_id = m.household_id and other.user_id <> target_user_id
      )
      or (
        m.household_id = any (households_to_delete)
        and m.role = 'owner'
        and private.owner_count(m.household_id) <= 1
      )
    );

  select coalesce(jsonb_agg(b.household_name), '[]'::jsonb)
  into blockers
  from private.account_deletion_blockers(target_user_id) b
  where b.household_id <> all (doomed_ids);

  if jsonb_array_length(blockers) > 0 then
    return jsonb_build_object('status', 'last_owner', 'households', blockers);
  end if;

  select coalesce(array_agg(object_name), '{}')
  into pet_names
  from (
    select split_part(split_part(p.photo_url, '/pet-photos/', 2), '?', 1) as object_name
    from public.pets p
    where p.household_id = any (doomed_ids)
      and p.photo_url is not null
    union
    select ph.storage_path
    from public.pet_photos ph
    join public.pets p on p.id = ph.pet_id
    where p.household_id = any (doomed_ids)
  ) names
  where object_name is not null and object_name <> '';

  select coalesce(array_agg(distinct pp.storage_path), '{}')
  into post_names
  from public.post_photos pp
  join public.posts po on po.id = pp.post_id
  where po.household_id = any (doomed_ids)
     or po.author_id = target_user_id;

  delete from public.households where id = any (doomed_ids);

  return jsonb_build_object(
    'status', 'ok',
    'pet_photos', to_jsonb(pet_names),
    'post_photos', to_jsonb(post_names)
  );
end;
$$;

revoke execute on function public.prepare_account_deletion(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid, uuid[]) to service_role;
