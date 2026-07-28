-- The Expo push token is the primary key rather than a surrogate id because
-- the token IS the natural key. That makes registration a single upsert, and
-- the conflict clause handles the case that actually bites in development:
-- two accounts on one phone. Sign out, sign in as your partner to test the
-- feature, and the same token is reassigned rather than left as a stale row
-- pushing one person's household alerts into another person's session.
--
-- A single expo_push_token column on users (what Supabase's own guide does)
-- was rejected: it caps you at one device per account and breaks the moment
-- you sign into a second simulator to test the feature you are building.

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

-- No SELECT policy, deliberately. No user ever needs to read a push token,
-- including their own. The Edge Function reads with the service role, which
-- bypasses RLS. A member may only manage rows that are theirs.
--
-- (select auth.uid()) rather than bare auth.uid() is the documented Supabase
-- RLS performance pattern: the planner evaluates it once per statement rather
-- than once per row.

create policy "Users can register their own push token"
on public.push_tokens for insert
to authenticated
with check ( user_id = (select auth.uid()) );

create policy "Users can refresh their own push token"
on public.push_tokens for update
to authenticated
using ( user_id = (select auth.uid()) )
with check ( user_id = (select auth.uid()) );

create policy "Users can delete their own push token"
on public.push_tokens for delete
to authenticated
using ( user_id = (select auth.uid()) );

-- The grant omits select to match the missing select policy -- belt and
-- braces, and it makes the intent legible without reading the policies.
revoke all on public.push_tokens from anon, authenticated;
grant insert, update, delete on public.push_tokens to authenticated;
