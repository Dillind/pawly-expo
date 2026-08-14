-- The inbox reads the outbox. `alerts` has recorded every queued event since
-- 20260728090200 but nothing in the app could see it -- that migration revoked
-- the table from `authenticated` and left RLS on with no policy, because only
-- the Edge Function had a reason to read it. It also named the shape this
-- migration should take, and this follows it.

grant select on public.alerts to authenticated;

-- Membership at read time, not at queue time. Someone removed from a household
-- loses its history with it, which is the same rule the pets and feed_logs
-- policies already apply.
create policy "Members can view their household's alerts"
  on public.alerts
  for select
  to authenticated
  using (private.is_household_member(household_id));

-- Sparse on purpose: a row exists only once someone has read something.
-- `alerts` is one row per event and the inbox is per person, so read state
-- cannot live on it -- two members reading the same alert are two facts.
--
-- The cheaper alternative, an alerts_last_seen_at column on household_members
-- mirroring posts_last_seen_at, was rejected: a single timestamp cannot say
-- "this one is read and the older one beside it is not", which is what the
-- per-row unread fill needs.
create table public.alert_reads (
  alert_id uuid not null references public.alerts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);

alter table public.alert_reads enable row level security;

grant select, insert on public.alert_reads to authenticated;

-- Read state is nobody else's business, so both policies are the reader's own
-- rows rather than the household's. There is no update or delete grant:
-- marking read is insert-once, and unreading is not a feature.
create policy "Users can view their own reads"
  on public.alert_reads
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can mark alerts they can see as read"
  on public.alert_reads
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.alerts
      where alerts.id = alert_reads.alert_id
        and private.is_household_member(alerts.household_id)
    )
  );

-- The inbox query: a household's alerts, newest first. Paginated, so the sort
-- has to be indexed or every page scans the household's whole history.
create index alerts_household_recent_idx
  on public.alerts (household_id, created_at desc);
