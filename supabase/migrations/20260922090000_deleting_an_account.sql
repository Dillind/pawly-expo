-- CRU-156. Deleting an account. ADR 0045 has the reasoning.
--
-- Every other reference to a user already either cascades (their own rows) or
-- sets null (the household's record of what they did). Reminders were the
-- exception: a household's Reminder, and the tick that says it was done,
-- vanished with the member who wrote them.

alter table public.reminders
  alter column created_by drop not null,
  drop constraint reminders_created_by_fkey,
  add constraint reminders_created_by_fkey
    foreign key (created_by) references auth.users (id) on delete set null;

alter table public.reminder_completions
  alter column done_by drop not null,
  drop constraint reminder_completions_done_by_fkey,
  add constraint reminder_completions_done_by_fkey
    foreign key (done_by) references auth.users (id) on delete set null;

-- Households where this user is the only Owner and someone else is still a
-- member. Deleting the account would leave those members with no Owner.
create or replace function private.account_deletion_blockers(target_user_id uuid)
returns table (household_id uuid, household_name text)
language sql
security definer
set search_path = ''
stable
as $$
  select h.id, h.name
  from public.household_members m
  join public.households h on h.id = m.household_id
  where m.user_id = target_user_id
    and m.role = 'owner'
    and private.owner_count(m.household_id) <= 1
    and exists (
      select 1 from public.household_members other
      where other.household_id = m.household_id
        and other.user_id <> target_user_id
    )
  order by h.name;
$$;

revoke execute on function private.account_deletion_blockers(uuid) from public, anon, authenticated;

create or replace function public.account_deletion_blockers()
returns jsonb
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce(jsonb_agg(b.household_name), '[]'::jsonb)
  from private.account_deletion_blockers((select auth.uid())) b;
$$;

revoke execute on function public.account_deletion_blockers() from public, anon;
grant execute on function public.account_deletion_blockers() to authenticated;

-- Called by the delete-account Edge Function with the service role, just
-- before it deletes the auth user. Removes every Household the user is the
-- only member of and returns the photos those rows pointed at, because Postgres
-- refuses a delete from storage.objects. The auth delete cascades the rest.
create or replace function public.prepare_account_deletion(target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  blockers jsonb;
  sole_ids uuid[];
  pet_names text[];
  post_names text[];
begin
  -- Locks the user's households so a join or a role change cannot slip in
  -- between the check and the delete.
  perform 1
  from public.households h
  join public.household_members m on m.household_id = h.id
  where m.user_id = target_user_id
  order by h.id
  for update of h;

  select coalesce(jsonb_agg(b.household_name), '[]'::jsonb)
  into blockers
  from private.account_deletion_blockers(target_user_id) b;

  if jsonb_array_length(blockers) > 0 then
    return jsonb_build_object('status', 'last_owner', 'households', blockers);
  end if;

  select coalesce(array_agg(m.household_id), '{}')
  into sole_ids
  from public.household_members m
  where m.user_id = target_user_id
    and not exists (
      select 1 from public.household_members other
      where other.household_id = m.household_id
        and other.user_id <> target_user_id
    );

  select coalesce(array_agg(object_name), '{}')
  into pet_names
  from (
    select split_part(split_part(p.photo_url, '/pet-photos/', 2), '?', 1) as object_name
    from public.pets p
    where p.household_id = any (sole_ids)
      and p.photo_url is not null
    union
    select ph.storage_path
    from public.pet_photos ph
    join public.pets p on p.id = ph.pet_id
    where p.household_id = any (sole_ids)
  ) names
  where object_name is not null and object_name <> '';

  select coalesce(array_agg(pp.storage_path), '{}')
  into post_names
  from public.post_photos pp
  join public.posts po on po.id = pp.post_id
  where po.household_id = any (sole_ids);

  delete from public.households where id = any (sole_ids);

  return jsonb_build_object(
    'status', 'ok',
    'pet_photos', to_jsonb(pet_names),
    'post_photos', to_jsonb(post_names)
  );
end;
$$;

revoke execute on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
