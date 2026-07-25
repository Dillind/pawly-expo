-- Feed logs: the core record of the app. See
-- docs/superpowers/specs/2026-07-25-feed-logging-design.md.
--
-- logged_by is nullable with `on delete set null`. A cascade would erase a
-- household's entire feeding history the day a Contributor deletes their
-- account; the cost of nullable is one render branch ("Removed member").
--
-- logged_at is separate from created_at and is the mutable one: it is what the
-- slot matcher reads and what backdating changes. created_at never moves,
-- which is what makes it the correct basis for the Contributor edit window.
--
-- No amount/portion column. Neither the brief nor the glossary calls for one;
-- notes absorbs "half scoop" until structure is actually requested.

create table public.feed_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  logged_by uuid references public.users(id) on delete set null,
  logged_at timestamptz not null default now(),
  notes text check (notes is null or length(notes) <= 280),
  created_at timestamptz not null default now()
);

create index feed_logs_pet_id_logged_at_idx on public.feed_logs (pet_id, logged_at desc);

alter table public.feed_logs enable row level security;

-- The 24-hour bounds live in policies rather than a CHECK constraint, because
-- Postgres rejects non-immutable functions such as now() inside CHECK. Policy
-- expressions are evaluated per statement and may use it.
--
-- private.is_pet_household_member / is_pet_household_owner already exist from
-- the pet/household onboarding migration and are reused unchanged.

create policy "Members can view feed logs for their household's pets"
on public.feed_logs for select
using ( private.is_pet_household_member(pet_id) );

create policy "Members can log feeds for their household's pets"
on public.feed_logs for insert to authenticated
with check (
  private.is_pet_household_member(pet_id)
  and logged_by = (select auth.uid())
  and logged_at <= now()
  and logged_at >= now() - interval '24 hours'
);

-- The logged_at bounds apply to Owners too. An Owner backdating beyond 24
-- hours is precisely the move that retroactively silences a Missed Feed Alert
-- that has already been pushed.

create policy "Owners can update any feed log, contributors their own recent ones"
on public.feed_logs for update
using (
  private.is_pet_household_owner(pet_id)
  or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' )
)
with check (
  ( private.is_pet_household_owner(pet_id)
    or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' ) )
  and logged_at <= now()
  and logged_at >= now() - interval '24 hours'
);

create policy "Owners can delete any feed log, contributors their own recent ones"
on public.feed_logs for delete
using (
  private.is_pet_household_owner(pet_id)
  or ( logged_by = (select auth.uid()) and created_at > now() - interval '24 hours' )
);
