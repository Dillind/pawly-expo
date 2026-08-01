-- A handover document, not a medical record (CONTEXT.md). It holds what a
-- Contributor needs to look after the animal today, never dated clinical
-- history -- the vet already keeps that.

create table public.care_cards (
  pet_id uuid primary key references public.pets (id) on delete cascade,
  allergies text,
  vet_name text,
  vet_phone text,
  emergency_vet_name text,
  emergency_vet_phone text,
  microchip_number text,
  insurance_provider text,
  insurance_policy_number text,
  feeding_notes text,
  notes text,
  updated_at timestamptz not null default now()
);

create table public.care_card_medications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  name text not null,
  dose text,
  schedule_text text,
  instructions text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index care_card_medications_pet_id_idx
  on public.care_card_medications (pet_id, sort_order);

alter table public.care_cards enable row level security;
alter table public.care_card_medications enable row level security;

-- Reuses the helpers from the onboarding migration: feeding_schedules has no
-- household_id of its own either, and these join through pets the same way.

create policy "Members can view a care card"
on public.care_cards for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can write a care card"
on public.care_cards for all
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

create policy "Members can view medications"
on public.care_card_medications for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can write medications"
on public.care_card_medications for all
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

revoke all on public.care_cards from anon, authenticated;
revoke all on public.care_card_medications from anon, authenticated;
grant select, insert, update, delete on public.care_cards to authenticated;
grant select, insert, update, delete on public.care_card_medications to authenticated;
