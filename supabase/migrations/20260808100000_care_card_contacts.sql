-- One backup contact was never enough, and "your phone" was never a different
-- kind of thing from it. A sitter reading the card just wants a list of people
-- to ring, in order. So both `owner_phone` and the single backup pair collapse
-- into one child table, the same shape as care_card_medications.

create table public.care_card_contacts (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  name text not null,
  -- Nullable only so the backfill below can carry across a half-filled backup
  -- contact rather than drop it. The app requires a number on every contact it
  -- creates from here on.
  phone text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index care_card_contacts_pet_id_idx
  on public.care_card_contacts (pet_id, sort_order);

alter table public.care_card_contacts enable row level security;

create policy "Members can view contacts"
on public.care_card_contacts for select
using ( private.is_pet_household_member(pet_id) );

create policy "Owners can write contacts"
on public.care_card_contacts for all
using ( private.is_pet_household_owner(pet_id) )
with check ( private.is_pet_household_owner(pet_id) );

revoke all on public.care_card_contacts from anon, authenticated;
grant select, insert, update, delete on public.care_card_contacts to authenticated;

-- The cap belongs here as well as in the UI: three is a rule about the
-- document, and a client is not the place to enforce one.
create or replace function private.enforce_care_card_contact_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.care_card_contacts where pet_id = new.pet_id) >= 3 then
    raise exception 'A Care Card can hold at most three contacts'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger care_card_contacts_cap
before insert on public.care_card_contacts
for each row execute function private.enforce_care_card_contact_cap();

-- The owner's own number becomes contact 0, named from their profile rather
-- than a placeholder -- a sitter needs to know whose number they are ringing.
insert into public.care_card_contacts (pet_id, name, phone, sort_order)
select
  c.pet_id,
  coalesce(
    nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''),
    'Owner'
  ),
  c.owner_phone,
  0
from public.care_cards c
join public.pets p on p.id = c.pet_id
join public.household_members hm
  on hm.household_id = p.household_id and hm.role = 'owner'
join public.users u on u.id = hm.user_id
where nullif(trim(c.owner_phone), '') is not null;

insert into public.care_card_contacts (pet_id, name, phone, sort_order)
select pet_id, backup_contact_name, backup_contact_phone, 1
from public.care_cards
where nullif(trim(backup_contact_name), '') is not null;

alter table public.care_cards
  drop column owner_phone,
  drop column backup_contact_name,
  drop column backup_contact_phone;
