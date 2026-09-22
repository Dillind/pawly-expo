-- Review fixes for the feature request board (PR #241).
-- A team member's block no longer hides requests from their Reported list, and the
-- daily report limit takes a per-user lock, as request creation already does.

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
    and (
      viewer.is_team
      or not exists (
        select 1 from public.feature_request_blocks b
        where b.blocker_id = viewer.id and b.blocked_id = r.author_id
      )
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

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('feature_request_report:' || caller::text, 0));

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
