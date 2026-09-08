-- A stem with fewer than two usable characters gets no suggestions.
--
-- It used to fall back to the literal `member`, which offered `member1` --
-- exactly the handle shape CRU-127 exists to stop producing. Nothing can reach
-- it from the app either: suggestions are only asked for once a handle is taken
-- or reserved, and neither is possible with one character.
create or replace function public.username_suggestions(stem text, wanted int default 3)
returns setof text
language sql
security definer
set search_path = ''
stable
as $$
  with root as (
    -- Leading non-letters are dropped because a handle has to start with one.
    -- 18, so the longest suffix (`30`) still fits 20 characters.
    select left(cleaned, 18) as value
    from (
      select regexp_replace(
        regexp_replace(lower(coalesce(stem, '')), '[^a-z0-9_]', '', 'g'),
        '^[^a-z]+',
        ''
      ) as cleaned
    ) stripped
    where length(cleaned) >= 2
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
