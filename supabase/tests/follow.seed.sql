-- Two people, one household, one pet, one post.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'owner@example.com', '{"first_name":"Kathy"}'),
  ('22222222-2222-2222-2222-222222222222', 'follower@example.com', '{"first_name":"Dylan"}'),
  ('33333333-3333-3333-3333-333333333333', 'stranger@example.com', '{"first_name":"Sam"}')
  on conflict do nothing;

insert into public.users (id, first_name, last_name) values
  ('11111111-1111-1111-1111-111111111111', 'Kathy', 'Nolan'),
  ('22222222-2222-2222-2222-222222222222', 'Dylan', 'Lindsay'),
  ('33333333-3333-3333-3333-333333333333', 'Sam', 'Barnes')
  on conflict (id) do nothing;

insert into public.households (id, name, timezone) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kathy''s Household', 'Australia/Melbourne');

insert into public.household_members (household_id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'owner');

insert into public.pets (id, household_id, name, breed) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Rufus', 'Kelpie');

insert into public.posts (id, household_id, author_id, title, caption, occurred_at) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111', 'Beach day', 'Straight in.', now());
