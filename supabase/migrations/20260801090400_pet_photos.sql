-- 10 is the hard ceiling, enforced here because a client-side check is advice
-- and a trigger is a rule. The free-tier cap of 3 is a product rule and lives
-- in the app, once RevenueCat exists.

create table public.pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index pet_photos_pet_id_idx on public.pet_photos (pet_id, sort_order);

create or replace function private.enforce_pet_photo_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.pet_photos where pet_id = new.pet_id) >= 10 then
    raise exception 'A pet can have at most 10 photos'
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

create trigger pet_photos_cap
before insert on public.pet_photos
for each row
execute function private.enforce_pet_photo_cap();

alter table public.pet_photos enable row level security;

create policy "Members can view pet photos"
on public.pet_photos for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can write pet photos"
on public.pet_photos for all
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

revoke all on public.pet_photos from anon, authenticated;
grant select, insert, update, delete on public.pet_photos to authenticated;
