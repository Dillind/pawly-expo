\set QUIET on
\set ON_ERROR_STOP on
\pset pager off
create or replace function pg_temp.check(label text, got anyelement, want anyelement)
returns void language plpgsql as $$
begin
  if got is not distinct from want then
    raise notice 'PASS  %', label;
  else
    raise exception 'FAIL  % -- got %, want %', label, got, want;
  end if;
end $$;

create or replace procedure pg_temp.act_as(who uuid) language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', who::text, false);
  perform set_config('role', 'authenticated', false);
end $$;

-- Owner, follower, stranger.
\set owner '11111111-1111-1111-1111-111111111111'
\set follower '22222222-2222-2222-2222-222222222222'
\set household 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

-- ---------------------------------------------------------------- preview
call pg_temp.act_as(:'follower');
set local role authenticated;
select pg_temp.check('preview reports no relationship yet',
  public.follow_preview(:'household')->>'status', 'none');
select pg_temp.check('preview names the household through RLS the viewer fails',
  public.follow_preview(:'household')->>'name', 'Kathy''s Household');
select pg_temp.check('preview lists the pets before any accept',
  jsonb_array_length(public.follow_preview(:'household')->'pets'), 1);

-- ------------------------------------------------- the boundary before accept
select pg_temp.check('a stranger reads no posts',
  (select count(*)::int from public.posts), 0);
select pg_temp.check('a stranger reads no pets',
  (select count(*)::int from public.pets), 0);
select pg_temp.check('a stranger reads no household',
  (select count(*)::int from public.households), 0);

-- ---------------------------------------------------------------- requesting
select pg_temp.check('request_follow answers pending',
  public.request_follow(:'household')->>'status', 'pending');
select pg_temp.check('asking twice is not a second row',
  public.request_follow(:'household')->>'status', 'pending');
reset role;
select pg_temp.check('one follow row exists',
  (select count(*)::int from public.household_follows), 1);
select pg_temp.check('the Owner is told once',
  (select count(*)::int from public.alerts where kind = 'follow_requested'), 1);
select pg_temp.check('the alert is addressed to the Owner',
  (select recipient_id from public.alerts where kind = 'follow_requested'),
  :'owner'::uuid);
select pg_temp.check('the alert carries no subject_date, so several Owners can each hold one',
  (select subject_date from public.alerts where kind = 'follow_requested'), null::date);

-- a pending follower still reads nothing
call pg_temp.act_as(:'follower');
set local role authenticated;
select pg_temp.check('a pending follower reads no posts',
  (select count(*)::int from public.posts), 0);
select pg_temp.check('preview now reports pending',
  public.follow_preview(:'household')->>'status', 'pending');
select pg_temp.check('list_following shows the household while it waits',
  (select status::text from public.list_following()), 'pending');

-- ------------------------------------------------------- only an Owner answers
select pg_temp.check('a follower cannot accept their own request',
  public.respond_to_follow_request(
    (select id from public.household_follows), true)->>'status', 'not_owner');
reset role;

-- ---------------------------------------------------------------- accepting
call pg_temp.act_as(:'owner');
set local role authenticated;
select pg_temp.check('the Owner sees the person who asked',
  (select first_name from public.users where id = :'follower'::uuid), 'Dylan');
select pg_temp.check('the Owner accepts',
  public.respond_to_follow_request(
    (select id from public.household_follows), true)->>'status', 'accepted');
reset role;

-- ------------------------------------------------- the boundary after accept
call pg_temp.act_as(:'follower');
set local role authenticated;
select pg_temp.check('a follower reads the posts',
  (select count(*)::int from public.posts), 1);
select pg_temp.check('a follower reads the pets',
  (select count(*)::int from public.pets), 1);
select pg_temp.check('a follower reads the household',
  (select count(*)::int from public.households), 1);
select pg_temp.check('a follower reads the post author',
  (select count(*)::int from public.users where id = :'owner'::uuid), 1);
select pg_temp.check('a follower reads NO feed times',
  (select count(*)::int from public.feed_times), 0);
select pg_temp.check('a follower reads NO feed logs',
  (select count(*)::int from public.feed_logs), 0);
select pg_temp.check('a follower reads NO reminders',
  (select count(*)::int from public.reminders), 0);
select pg_temp.check('a follower reads NO care cards',
  (select count(*)::int from public.care_cards), 0);

-- a voice
insert into public.post_likes (post_id, user_id)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', :'follower'::uuid);
insert into public.post_comments (post_id, author_id, body)
  values ('cccccccc-cccc-cccc-cccc-cccccccccccc', :'follower'::uuid, 'What a face.');
select pg_temp.check('a follower can like', (select count(*)::int from public.post_likes), 1);
select pg_temp.check('a follower can comment',
  (select count(*)::int from public.post_comments), 1);
select pg_temp.check('list_following now reads accepted',
  (select status::text from public.list_following()), 'accepted');
reset role;

-- ---------------------------------------------------------------- removal
call pg_temp.act_as(:'owner');
set local role authenticated;
select pg_temp.check('the Owner removes',
  public.remove_follower((select id from public.household_follows))->>'status', 'removed');
reset role;

call pg_temp.act_as(:'follower');
set local role authenticated;
select pg_temp.check('a removed follower reads no posts again',
  (select count(*)::int from public.posts), 0);
select pg_temp.check('a removed follower cannot ask again, and is not told why',
  public.request_follow(:'household')->>'status', 'blocked');
select pg_temp.check('list_following drops a removed row',
  (select count(*)::int from public.list_following()), 0);
reset role;

select pg_temp.check('their like survives the removal',
  (select count(*)::int from public.post_likes), 1);
select pg_temp.check('their comment survives the removal',
  (select count(*)::int from public.post_comments), 1);
select pg_temp.check('the removal queues no second alert',
  (select count(*)::int from public.alerts where kind = 'follow_requested'), 1);

-- ------------------------------------------------- unfollow is repeatable
delete from public.household_follows;
delete from public.alerts where kind = 'follow_requested';
call pg_temp.act_as(:'follower');
set local role authenticated;
select pg_temp.check('asks again after the row is gone',
  public.request_follow(:'household')->>'status', 'pending');
select pg_temp.check('unfollow deletes rather than blocks',
  public.unfollow_household(:'household')->>'status', 'unfollowed');
select pg_temp.check('and so the same person may ask again',
  public.request_follow(:'household')->>'status', 'pending');
reset role;

-- ------------------------------------- one relationship, from the other side
insert into public.household_members (household_id, user_id, role)
  values (:'household'::uuid, :'follower'::uuid, 'contributor');
select pg_temp.check('joining the household drops the follow',
  (select count(*)::int from public.household_follows), 0);

call pg_temp.act_as(:'follower');
set local role authenticated;
select pg_temp.check('a member is told they are already in',
  public.request_follow(:'household')->>'status', 'already_member');
select pg_temp.check('preview reports membership',
  public.follow_preview(:'household')->>'status', 'member');
reset role;

select pg_temp.check('an unknown household is not found',
  public.follow_preview('00000000-0000-0000-0000-000000000000')->>'status', 'not_found');
