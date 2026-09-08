-- Suggestions for a handle that is taken or reserved.
--
-- Every suggestion is checked, so `ben1, ben3, ben4` is a truthful list rather
-- than a count -- `ben2` is missing because someone holds it. One round trip:
-- the alternative is the client asking username_available thirty times.
--
-- SECURITY DEFINER for the same reason username_available is: public.users is
-- behind household-scoped RLS, and this returns only handles that are free,
-- which is what a unique namespace exposes anyway.
create function public.username_suggestions(stem text, wanted int default 3)
returns setof text
language sql
security definer
set search_path = ''
stable
as $$
  with root as (
    select
      case
        -- 18, so the longest suffix (`30`) still fits 20 characters.
        when length(cleaned) >= 2 then left(cleaned, 18)
        else 'member'
      end as value
    from (
      select regexp_replace(
        regexp_replace(lower(coalesce(stem, '')), '[^a-z0-9_]', '', 'g'),
        '^[^a-z]+',
        ''
      ) as cleaned
    ) stripped
  ),
  candidates as (
    select n, root.value || n::text as candidate
    from root, generate_series(1, 30) as n
  )
  select candidate
  from candidates
  where public.username_available(candidate)
  order by n
  limit least(greatest(coalesce(wanted, 3), 0), 30);
$$;

revoke execute on function public.username_suggestions(text, int) from public;
grant execute on function public.username_suggestions(text, int) to anon, authenticated;
