-- A new household starts with four occasions, not six. "Adoption day" and
-- "Bath" were the two that read as examples rather than as the vocabulary a
-- household actually reaches for, and a shorter list is easier to add to than
-- a long one is to prune.
--
-- Only new households are affected. The rows an existing household already
-- holds stay exactly as they are: a Post is a record of a day, so removing an
-- Occasion here would rewrite what those posts said.
create or replace function private.seed_household_occasions(target_household_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.occasions (household_id, emoji, label, sort_order)
  values
    (target_household_id, '🎉', 'Milestone', 0),
    (target_household_id, '🎂', 'Birthday', 1),
    (target_household_id, '🎓', 'Training', 2),
    (target_household_id, '🏥', 'Vet visit', 3);
$$;
