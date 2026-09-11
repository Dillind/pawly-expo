-- Search over Listed Households, by name or handle.
--
-- Definer, like follow_preview: a stranger can read neither the household row
-- nor its pets through RLS, and a search that returned only what RLS allows
-- would return the caller's own households and nothing else.
--
-- is_listed is the whole gate. An Unlisted Household returns nothing for any
-- query, its exact handle included -- which is the promise the switch makes.
create function public.search_households(query text, max_results int default 20)
returns table (
  household_id uuid,
  name text,
  handle text,
  pet_count integer,
  relationship text
)
language sql
security definer
set search_path = ''
stable
as $$
  with q as (
    -- A typed % matches every household and a typed _ matches any character,
    -- so both are escaped before they reach like. The backslash goes first or
    -- it escapes the escapes.
    select
      lower(trim(coalesce(query, ''))) as term,
      replace(replace(replace(lower(trim(coalesce(query, ''))), '\', '\\'), '%', '\%'), '_', '\_')
        as pattern
  )
  select
    h.id,
    h.name,
    h.handle,
    (select count(*)::integer from public.pets p where p.household_id = h.id),
    -- Per row, so the search row can report where the caller stands without a
    -- second round trip. 'blocked' reads as 'none', matching follow_preview:
    -- a removed person is never told they were removed.
    case
      when private.is_household_member(h.id) then 'member'
      when f.status = 'accepted' then 'accepted'
      when f.status = 'pending' then 'pending'
      else 'none'
    end
  from public.households h
  cross join q
  left join public.household_follows f
    on f.household_id = h.id
   and f.follower_id = auth.uid()
  where length(q.term) >= 2
    and h.is_listed
    and (
      lower(h.name) like '%' || q.pattern || '%' escape '\'
      or lower(h.handle) like '%' || q.pattern || '%' escape '\'
    )
  -- An exact handle is the one unambiguous answer, so it leads. Then the two
  -- prefixes, then the name, so the order is stable for an unmatched tie.
  order by
    (lower(h.handle) = q.term) desc,
    (lower(h.handle) like q.pattern || '%' escape '\') desc,
    (lower(h.name) like q.pattern || '%' escape '\') desc,
    h.name
  limit least(greatest(coalesce(max_results, 20), 1), 50);
$$;

revoke execute on function public.search_households(text, int) from public, anon;
grant execute on function public.search_households(text, int) to authenticated;
