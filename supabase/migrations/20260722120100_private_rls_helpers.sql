-- Move the RLS helper functions (and the signup trigger function) out of the
-- public schema into a private one. public is an "Exposed schema" — anything
-- in it is automatically callable by anon/authenticated via PostgREST at
-- /rest/v1/rpc/<name>, which the security advisor flagged for all three
-- SECURITY DEFINER functions from the previous migration. Moving them to a
-- non-exposed schema (Supabase's own documented pattern for this) removes
-- that API surface entirely, rather than patching it with revoked grants.

create schema if not exists private;

create or replace function private.is_household_member(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_members.household_id = target_household_id
      and household_members.user_id = auth.uid()
  );
$$;

create or replace function private.is_household_owner(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_members
    where household_members.household_id = target_household_id
      and household_members.user_id = auth.uid()
      and household_members.role = 'owner'
  );
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, first_name, last_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;

-- Re-point policies at the private versions.

drop policy "Members can view their households" on public.households;
create policy "Members can view their households"
on public.households for select
using ( private.is_household_member(id) );

drop policy "Members can view their household's membership list" on public.household_members;
create policy "Members can view their household's membership list"
on public.household_members for select
using ( private.is_household_member(household_id) );

-- Re-point the trigger at the private function, then drop the old public ones.

drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

drop function public.is_household_member(uuid);
drop function public.is_household_owner(uuid);
drop function public.handle_new_user();
