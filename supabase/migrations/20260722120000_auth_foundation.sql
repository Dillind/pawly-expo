-- Households and membership

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null,
  grace_window_minutes integer not null default 60,
  created_at timestamptz not null default now()
);

create type public.household_role as enum ('owner', 'contributor');

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null,
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

-- App-facing user profile, separate from Supabase-managed auth.users.
-- first_name/last_name are nullable at the DB layer (not the form layer) so the
-- handle_new_user trigger below can never fail signup on a missing metadata key.
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.users enable row level security;

-- RLS helper functions. security definer + set search_path = '' is required
-- so these can read household_members (which itself has RLS enabled) without
-- deadlocking against its own policies, and so they can't be tricked into
-- querying a same-named table in a different schema.

create or replace function public.is_household_member(target_household_id uuid)
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

create or replace function public.is_household_owner(target_household_id uuid)
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

-- Households: view-only for now. Insert/update/delete policies land with the
-- household-onboarding work in a later pass — until then RLS defaults to deny,
-- which is correct (no UI creates a household yet).
create policy "Members can view their households"
on public.households for select
using ( public.is_household_member(id) );

create policy "Members can view their household's membership list"
on public.household_members for select
using ( public.is_household_member(household_id) );

-- Users: everyone can see their own profile immediately after signup, even
-- before they belong to any household. Fellow household members become
-- visible once household_members rows exist.
create policy "Users can view their own profile"
on public.users for select
using ( id = auth.uid() );

create policy "Users can view fellow household members' profiles"
on public.users for select
using (
  exists (
    select 1
    from public.household_members as my_membership
    join public.household_members as their_membership
      on their_membership.household_id = my_membership.household_id
    where my_membership.user_id = auth.uid()
      and their_membership.user_id = public.users.id
  )
);

create policy "Users can update their own profile"
on public.users for update
using ( id = auth.uid() )
with check ( id = auth.uid() );

-- Populates public.users the instant someone signs up, from the metadata
-- passed to supabase.auth.signUp({ options: { data: { first_name, last_name } } }).
-- Runs regardless of signup method, so it keeps working unchanged once
-- Apple/Google OAuth are added in v2.
create function public.handle_new_user()
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
