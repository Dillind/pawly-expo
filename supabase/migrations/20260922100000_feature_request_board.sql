-- The feature request board. See ADR 0043: the first content every user can see,
-- so App Store guideline 1.2 applies in full.

alter type public.alert_kind add value if not exists 'feature_request_reported';

-- A new enum value cannot be used in the transaction that adds it.
commit;

create type public.feature_request_status as enum ('open', 'planned', 'in_progress', 'done', 'declined');

create table public.crumpet_team (
  user_id uuid primary key references auth.users (id) on delete cascade
);

alter table public.crumpet_team enable row level security;
revoke all on public.crumpet_team from anon, authenticated;

create table public.feature_board_bans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.feature_board_bans enable row level security;
revoke all on public.feature_board_bans from anon, authenticated;

create table public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  status public.feature_request_status not null default 'open',
  vote_count integer not null default 0,
  hidden_at timestamptz,
  created_at timestamptz not null default now()
);

create index feature_requests_top_idx
  on public.feature_requests (vote_count desc, created_at desc, id desc);
create index feature_requests_new_idx
  on public.feature_requests (created_at desc, id desc);
create index feature_requests_author_idx
  on public.feature_requests (author_id, created_at);

create table public.feature_request_votes (
  request_id uuid not null references public.feature_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create index feature_request_votes_user_idx on public.feature_request_votes (user_id);

create table public.feature_request_reports (
  request_id uuid not null references public.feature_requests (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, reporter_id)
);

create index feature_request_reports_reporter_idx
  on public.feature_request_reports (reporter_id, created_at);

create table public.feature_request_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.feature_requests enable row level security;
alter table public.feature_request_votes enable row level security;
alter table public.feature_request_reports enable row level security;
alter table public.feature_request_blocks enable row level security;

revoke all on public.feature_requests from anon, authenticated;
revoke all on public.feature_request_votes from anon, authenticated;
revoke all on public.feature_request_reports from anon, authenticated;
revoke all on public.feature_request_blocks from anon, authenticated;

create or replace function public.is_crumpet_team()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.crumpet_team where user_id = auth.uid());
$$;

create or replace function private.is_board_banned(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.feature_board_bans where user_id = target_user_id);
$$;

create or replace function private.can_see_feature_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.feature_requests r
    where r.id = target_request_id
      and (
        r.author_id = auth.uid()
        or public.is_crumpet_team()
        or (
          r.hidden_at is null
          and not exists (
            select 1 from public.feature_request_blocks b
            where b.blocker_id = auth.uid() and b.blocked_id = r.author_id
          )
        )
      )
  );
$$;

revoke all on function private.is_board_banned(uuid) from public, anon;
revoke all on function private.can_see_feature_request(uuid) from public, anon;
grant execute on function private.is_board_banned(uuid) to authenticated;
grant execute on function private.can_see_feature_request(uuid) to authenticated;

-- Votes are the only table a client writes directly. Every other write is an RPC.
grant select, insert, delete on public.feature_request_votes to authenticated;

create policy "A user reads their own votes"
on public.feature_request_votes for select to authenticated
using (user_id = (select auth.uid()));

create policy "A user votes on a request they can see"
on public.feature_request_votes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and not private.is_board_banned((select auth.uid()))
  and private.can_see_feature_request(request_id)
);

create policy "A user removes their own vote"
on public.feature_request_votes for delete to authenticated
using (user_id = (select auth.uid()));

-- Only this trigger writes vote_count. It also runs when an account's votes cascade away.
create or replace function private.count_feature_request_vote()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.feature_requests set vote_count = vote_count + 1 where id = new.request_id;
    return new;
  end if;

  update public.feature_requests set vote_count = greatest(vote_count - 1, 0) where id = old.request_id;
  return old;
end $$;

create trigger feature_request_votes_count
after insert or delete on public.feature_request_votes
for each row execute function private.count_feature_request_vote();

create or replace function private.has_blocked_word(content text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(content) ~ '\m(fuck\w*|shit\w*|cunt\w*|bitch\w*|nigg\w*|fag\w*|retard\w*|whore\w*|slut\w*|porn\w*|viagra|casino|crypto\w*|onlyfans)\M';
$$;

create or replace function public.create_feature_request(title text, description text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  clean_title text := btrim(title);
  clean_description text := nullif(btrim(description), '');
  new_id uuid;
begin
  if caller is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if private.is_board_banned(caller) then
    raise exception 'board_banned' using errcode = 'P0001';
  end if;

  if private.has_blocked_word(clean_title || ' ' || coalesce(clean_description, '')) then
    raise exception 'blocked_content' using errcode = 'P0001';
  end if;

  -- Two posts at once both counted four. The per-user lock serialises them.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('feature_request:' || caller::text, 0));

  if (
    select count(*) from public.feature_requests
    where author_id = caller and created_at > now() - interval '1 day'
  ) >= 5 then
    raise exception 'daily_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.feature_requests (author_id, title, description)
  values (caller, clean_title, clean_description)
  returning id into new_id;

  insert into public.feature_request_votes (request_id, user_id) values (new_id, caller);

  return new_id;
end $$;

create or replace function public.list_feature_requests(
  sort text default 'top',
  reported_only boolean default false,
  after_vote_count integer default null,
  after_created_at timestamptz default null,
  after_id uuid default null,
  page_size integer default 20
)
returns table (
  id uuid,
  title text,
  description text,
  status public.feature_request_status,
  vote_count integer,
  has_voted boolean,
  is_mine boolean,
  is_team_post boolean,
  is_hidden boolean,
  report_count integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with viewer as (
    select auth.uid() as id, public.is_crumpet_team() as is_team
  )
  select
    r.id,
    r.title,
    r.description,
    r.status,
    r.vote_count,
    exists (
      select 1 from public.feature_request_votes v
      where v.request_id = r.id and v.user_id = viewer.id
    ),
    r.author_id = viewer.id,
    exists (select 1 from public.crumpet_team t where t.user_id = r.author_id),
    r.hidden_at is not null,
    case when viewer.is_team then (
      select count(*)::integer from public.feature_request_reports p where p.request_id = r.id
    ) else 0 end,
    r.created_at
  from public.feature_requests r, viewer
  where viewer.id is not null
    and (r.hidden_at is null or r.author_id = viewer.id or viewer.is_team)
    and not exists (
      select 1 from public.feature_request_blocks b
      where b.blocker_id = viewer.id and b.blocked_id = r.author_id
    )
    and (
      not reported_only
      or (viewer.is_team and exists (select 1 from public.feature_request_reports p where p.request_id = r.id))
    )
    and (
      after_id is null
      or (sort = 'new' and (r.created_at, r.id) < (after_created_at, after_id))
      or (sort <> 'new' and (r.vote_count, r.created_at, r.id) < (after_vote_count, after_created_at, after_id))
    )
  order by
    case when sort = 'new' then null else r.vote_count end desc nulls last,
    r.created_at desc,
    r.id desc
  limit least(greatest(page_size, 1), 50);
$$;

create or replace function public.get_feature_request(request_id uuid)
returns table (
  id uuid,
  title text,
  description text,
  status public.feature_request_status,
  vote_count integer,
  has_voted boolean,
  is_mine boolean,
  is_team_post boolean,
  is_hidden boolean,
  report_count integer,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.title,
    r.description,
    r.status,
    r.vote_count,
    exists (
      select 1 from public.feature_request_votes v
      where v.request_id = r.id and v.user_id = auth.uid()
    ),
    r.author_id = auth.uid(),
    exists (select 1 from public.crumpet_team t where t.user_id = r.author_id),
    r.hidden_at is not null,
    case when public.is_crumpet_team() then (
      select count(*)::integer from public.feature_request_reports p where p.request_id = r.id
    ) else 0 end,
    r.created_at
  from public.feature_requests r
  where r.id = get_feature_request.request_id
    and private.can_see_feature_request(r.id);
$$;

create or replace function public.report_feature_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  target public.feature_requests;
  trusted_reports integer;
begin
  if caller is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if private.is_board_banned(caller) then
    raise exception 'board_banned' using errcode = 'P0001';
  end if;

  if not private.can_see_feature_request(report_feature_request.request_id) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  select * into target from public.feature_requests r where r.id = report_feature_request.request_id;

  if target.author_id = caller then
    raise exception 'own_request' using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.feature_request_reports
    where reporter_id = caller and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'daily_limit_reached' using errcode = 'P0001';
  end if;

  insert into public.feature_request_reports (request_id, reporter_id)
  values (target.id, caller)
  on conflict do nothing;

  if not found then
    return;
  end if;

  -- Only accounts older than a week count, so three new accounts cannot hide a request.
  select count(*) into trusted_reports
  from public.feature_request_reports p
  join auth.users u on u.id = p.reporter_id
  where p.request_id = target.id
    and u.created_at < now() - interval '7 days';

  if trusted_reports >= 3
    and target.hidden_at is null
    and not exists (select 1 from public.crumpet_team t where t.user_id = target.author_id)
  then
    update public.feature_requests set hidden_at = now() where id = target.id;
  end if;

  insert into public.alerts (household_id, kind, subject_id, actor_id, recipient_id)
  select null, 'feature_request_reported', target.id, caller, t.user_id
  from public.crumpet_team t;
end $$;

create or replace function public.set_feature_request_status(
  request_id uuid,
  new_status public.feature_request_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_crumpet_team() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  update public.feature_requests set status = new_status
  where id = set_feature_request_status.request_id;
end $$;

create or replace function public.restore_feature_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_crumpet_team() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  delete from public.feature_request_reports p where p.request_id = restore_feature_request.request_id;
  update public.feature_requests set hidden_at = null where id = restore_feature_request.request_id;
end $$;

create or replace function public.delete_feature_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.feature_requests r
  where r.id = delete_feature_request.request_id
    and (r.author_id = auth.uid() or public.is_crumpet_team());

  if not found then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end $$;

create or replace function public.block_feature_request_author(request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  select r.author_id into author
  from public.feature_requests r
  where r.id = block_feature_request_author.request_id
    and private.can_see_feature_request(r.id);

  if author is null or author = auth.uid() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  insert into public.feature_request_blocks (blocker_id, blocked_id)
  values (auth.uid(), author)
  on conflict do nothing;
end $$;

create or replace function public.is_feature_board_banned()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_board_banned(auth.uid());
$$;

revoke all on function public.is_crumpet_team() from public, anon;
revoke all on function public.is_feature_board_banned() from public, anon;
revoke all on function public.create_feature_request(text, text) from public, anon;
revoke all on function public.list_feature_requests(text, boolean, integer, timestamptz, uuid, integer) from public, anon;
revoke all on function public.get_feature_request(uuid) from public, anon;
revoke all on function public.report_feature_request(uuid) from public, anon;
revoke all on function public.set_feature_request_status(uuid, public.feature_request_status) from public, anon;
revoke all on function public.restore_feature_request(uuid) from public, anon;
revoke all on function public.delete_feature_request(uuid) from public, anon;
revoke all on function public.block_feature_request_author(uuid) from public, anon;

grant execute on function public.is_crumpet_team() to authenticated;
grant execute on function public.is_feature_board_banned() to authenticated;
grant execute on function public.create_feature_request(text, text) to authenticated;
grant execute on function public.list_feature_requests(text, boolean, integer, timestamptz, uuid, integer) to authenticated;
grant execute on function public.get_feature_request(uuid) to authenticated;
grant execute on function public.report_feature_request(uuid) to authenticated;
grant execute on function public.set_feature_request_status(uuid, public.feature_request_status) to authenticated;
grant execute on function public.restore_feature_request(uuid) to authenticated;
grant execute on function public.delete_feature_request(uuid) to authenticated;
grant execute on function public.block_feature_request_author(uuid) to authenticated;

-- A report is addressed to a Crumpet team member, not to a household.
alter table public.alerts alter column household_id drop not null;
alter table public.alerts add constraint alerts_household_required
  check (household_id is not null or kind = 'feature_request_reported');
