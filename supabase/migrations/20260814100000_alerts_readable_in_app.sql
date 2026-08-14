-- 20260728090200 revoked `alerts` from `authenticated` and left RLS on with no
-- policy, because only the Edge Function read it. It also named the shape this
-- should take, and this follows it.

grant select on public.alerts to authenticated;

-- Membership at read time: leaving a household takes its history with it.
create policy "Members can view their household's alerts"
  on public.alerts
  for select
  to authenticated
  using (private.is_household_member(household_id));

-- Sparse: a row exists only once someone has read something. An
-- alerts_last_seen_at column on household_members would be cheaper, but a
-- single timestamp cannot say "this one is read and the older one beside it is
-- not", which is what the per-row unread fill needs.
create table public.alert_reads (
  alert_id uuid not null references public.alerts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);

alter table public.alert_reads enable row level security;

grant select, insert on public.alert_reads to authenticated;

-- The reader's own rows, not the household's. No update or delete grant:
-- marking read is insert-once.
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

-- Paginated, so the sort has to be indexed.
create index alerts_household_recent_idx
  on public.alerts (household_id, created_at desc);
