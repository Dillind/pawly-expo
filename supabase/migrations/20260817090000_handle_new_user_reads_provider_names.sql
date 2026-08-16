-- handle_new_user learns the keys Apple and Google actually send.
--
-- Email signup no longer passes first_name/last_name at all, and the two OAuth
-- providers never did:
--   Apple  sends given_name/family_name, and only on first authorisation.
--   Google sends full_name/name -- one string, so it is split on the first space.
-- Every key is still optional, so a signup can never fail on a missing one.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  resolved_first text;
  resolved_last text;
  whole_name text;
begin
  resolved_first := nullif(trim(coalesce(meta ->> 'first_name', meta ->> 'given_name')), '');
  resolved_last := nullif(trim(coalesce(meta ->> 'last_name', meta ->> 'family_name')), '');

  if resolved_first is null then
    whole_name := nullif(trim(coalesce(meta ->> 'full_name', meta ->> 'name')), '');

    if whole_name is not null then
      resolved_first := split_part(whole_name, ' ', 1);
      resolved_last := coalesce(
        resolved_last,
        nullif(trim(substr(whole_name, length(split_part(whole_name, ' ', 1)) + 1)), '')
      );
    end if;
  end if;

  insert into public.users (id, first_name, last_name)
  values (new.id, resolved_first, resolved_last);

  return new;
end;
$$;
