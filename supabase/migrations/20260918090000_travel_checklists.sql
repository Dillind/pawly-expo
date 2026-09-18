-- A Travel Checklist: what a Household packs when it takes its Pets away.
-- Household-owned, because a trip usually takes every Pet. Ticks are shared
-- and live on the item, so two people packing see the same bag.

create table public.travel_checklists (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  emoji text check (char_length(emoji) <= 16),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index travel_checklists_household_idx
  on public.travel_checklists (household_id, created_at);

create table public.travel_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.travel_checklists (id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 120),
  emoji text check (char_length(emoji) <= 16),
  pet_id uuid references public.pets (id) on delete set null,
  sort_order integer not null default 0,
  is_ticked boolean not null default false,
  ticked_by uuid references auth.users (id) on delete set null,
  ticked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index travel_checklist_items_checklist_idx
  on public.travel_checklist_items (checklist_id, sort_order, created_at);

create trigger travel_checklists_set_updated_at
  before update on public.travel_checklists
  for each row execute function private.set_updated_at();

create trigger travel_checklist_items_set_updated_at
  before update on public.travel_checklist_items
  for each row execute function private.set_updated_at();

-- The entitlement lives on the User (ADR 0041). Nothing writes this yet: the
-- RevenueCat webhook will, as the service role. Empty means free.
create table public.user_entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  is_pro boolean not null default false,
  source text,
  updated_at timestamptz not null default now()
);

create trigger user_entitlements_set_updated_at
  before update on public.user_entitlements
  for each row execute function private.set_updated_at();

create or replace function private.is_household_pro(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.household_members hm
    join public.user_entitlements ue on ue.user_id = hm.user_id
    where hm.household_id = target_household_id
      and ue.is_pro
  );
$$;

revoke all on function private.is_household_pro(uuid) from public, anon;

create or replace function private.checklist_household(target_checklist_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select household_id from public.travel_checklists where id = target_checklist_id;
$$;

revoke all on function private.checklist_household(uuid) from public, anon;
-- The policies below call it as the signed-in role.
grant execute on function private.checklist_household(uuid) to authenticated, service_role;

-- Free holds one. The sheet in the app is the door; this is the lock.
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

  if exists (
    select 1 from public.travel_checklists where household_id = new.household_id
  ) then
    raise exception 'checklist_cap_reached' using errcode = 'P0001';
  end if;

  return new;
end $$;

create trigger travel_checklists_enforce_cap
  before insert on public.travel_checklists
  for each row execute function private.enforce_checklist_cap();

-- An item's Pet must live in the checklist's Household, and a Contributor may
-- flip the tick and nothing else. `ticked_by` comes from the session, never
-- the client.
create or replace function private.guard_checklist_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  household uuid := private.checklist_household(new.checklist_id);
begin
  if new.pet_id is not null and not exists (
    select 1 from public.pets where id = new.pet_id and household_id = household
  ) then
    raise exception 'That pet is not in this household' using errcode = '23503';
  end if;

  if tg_op = 'UPDATE' then
    if new.is_ticked is distinct from old.is_ticked then
      new.ticked_by := case when new.is_ticked then auth.uid() end;
      new.ticked_at := case when new.is_ticked then now() end;
    else
      new.ticked_by := old.ticked_by;
      new.ticked_at := old.ticked_at;
    end if;

    if not private.is_household_owner(household) and (
      new.text is distinct from old.text
      or new.emoji is distinct from old.emoji
      or new.pet_id is distinct from old.pet_id
      or new.sort_order is distinct from old.sort_order
      or new.checklist_id is distinct from old.checklist_id
    ) then
      raise exception 'Only an owner can edit an item' using errcode = '42501';
    end if;
  end if;

  return new;
end $$;

create trigger travel_checklist_items_guard
  before insert or update on public.travel_checklist_items
  for each row execute function private.guard_checklist_item();

create or replace function public.reset_travel_checklist(target_checklist_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_household_member(private.checklist_household(target_checklist_id)) then
    raise exception 'Checklist not found' using errcode = '42501';
  end if;

  update public.travel_checklist_items
  set is_ticked = false, ticked_by = null, ticked_at = null
  where checklist_id = target_checklist_id and is_ticked;
end $$;

revoke execute on function public.reset_travel_checklist(uuid) from public, anon;
grant execute on function public.reset_travel_checklist(uuid) to authenticated;

alter table public.travel_checklists enable row level security;
alter table public.travel_checklist_items enable row level security;
alter table public.user_entitlements enable row level security;

create policy "Members can view their household's checklists"
on public.travel_checklists for select
using ( private.is_household_member(household_id) );

create policy "Owners can create checklists"
on public.travel_checklists for insert
with check ( private.is_household_owner(household_id) );

create policy "Owners can edit checklists"
on public.travel_checklists for update
using ( private.is_household_owner(household_id) )
with check ( private.is_household_owner(household_id) );

create policy "Owners can delete checklists"
on public.travel_checklists for delete
using ( private.is_household_owner(household_id) );

create policy "Members can view checklist items"
on public.travel_checklist_items for select
using ( private.is_household_member(private.checklist_household(checklist_id)) );

create policy "Owners can add checklist items"
on public.travel_checklist_items for insert
with check ( private.is_household_owner(private.checklist_household(checklist_id)) );

-- Members, not Owners: a tick is the act the list exists for. The trigger
-- above stops a Contributor changing anything but the tick.
create policy "Members can update checklist items"
on public.travel_checklist_items for update
using ( private.is_household_member(private.checklist_household(checklist_id)) )
with check ( private.is_household_member(private.checklist_household(checklist_id)) );

create policy "Owners can delete checklist items"
on public.travel_checklist_items for delete
using ( private.is_household_owner(private.checklist_household(checklist_id)) );

create policy "Users can view their own entitlement"
on public.user_entitlements for select
using ( user_id = (select auth.uid()) );

revoke all on public.travel_checklists from anon, authenticated;
revoke all on public.travel_checklist_items from anon, authenticated;
revoke all on public.user_entitlements from anon, authenticated;

grant select, delete on public.travel_checklists to authenticated;
grant insert (household_id, name, emoji, created_by) on public.travel_checklists to authenticated;
grant update (name, emoji) on public.travel_checklists to authenticated;

grant select, delete on public.travel_checklist_items to authenticated;
grant insert (checklist_id, text, emoji, pet_id, sort_order) on public.travel_checklist_items to authenticated;
grant update (text, emoji, pet_id, sort_order, is_ticked) on public.travel_checklist_items to authenticated;

grant select on public.user_entitlements to authenticated;

create or replace function public.is_household_pro(target_household_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select private.is_household_member(target_household_id)
     and private.is_household_pro(target_household_id);
$$;

revoke execute on function public.is_household_pro(uuid) from public, anon;
grant execute on function public.is_household_pro(uuid) to authenticated;
