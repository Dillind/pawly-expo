-- The Reported badge needs a count, not a page of rows (CRU-181).
-- A team member sees every request, so the count is every request with a report.

create or replace function public.count_reported_feature_requests()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_crumpet_team() then (
    select count(*)::integer from public.feature_requests r
    where exists (select 1 from public.feature_request_reports p where p.request_id = r.id)
  ) else 0 end;
$$;

revoke all on function public.count_reported_feature_requests() from public, anon;
grant execute on function public.count_reported_feature_requests() to authenticated;
