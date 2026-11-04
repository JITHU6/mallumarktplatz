-- =============================================================================
-- Security tests for RLS policies and moderation triggers.
-- Runs inside a transaction that is rolled back (no data is left behind).
-- Usage: npm run test:db   (requires a running local Supabase: `supabase start`)
-- =============================================================================
begin;

create or replace function pg_temp.assert(condition boolean, message text) returns void language plpgsql as $$
begin
  if not coalesce(condition, false) then raise exception 'ASSERTION FAILED: %', message; end if;
  raise notice 'ok - %', message;
end $$;

create or replace function pg_temp.login(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email, raw_user_meta_data, instance_id, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'owner@test.local', '{"full_name":"Olivia Owner"}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'other@test.local', '{}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.local', '{}', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
update public.profiles set role = 'admin' where id = '33333333-3333-3333-3333-333333333333';

select pg_temp.assert((select full_name from public.profiles where id = '11111111-1111-1111-1111-111111111111') = 'Olivia Owner',
  'profile is created from auth metadata');

-- Owner submits a listing and tries to self-approve/feature/verify ----------
set local role authenticated;
select pg_temp.login('11111111-1111-1111-1111-111111111111');
insert into public.businesses (name, category_id, short_description, postal_code, city, status, is_featured, is_verified, owner_id)
values ('Test Thattukada', (select id from public.business_categories where slug = 'restaurants'),
        'Kerala street food test listing', '80333', 'München', 'approved', true, true,
        '22222222-2222-2222-2222-222222222222');

select pg_temp.assert((select status from public.businesses where name = 'Test Thattukada') = 'pending', 'new listings are always pending');

-- Regression: INSERT ... RETURNING must work for owners (used by the app).
do $$
declare new_id uuid;
begin
  insert into public.businesses (name, category_id, short_description, postal_code, city)
  values ('Returning Test', (select id from public.business_categories where slug = 'grocery'), 'Insert returning test', '10115', 'Berlin')
  returning id into new_id;
  if new_id is null then raise exception 'no id returned'; end if;
end $$;
select pg_temp.assert(true, 'owners can INSERT ... RETURNING their new listing');
select pg_temp.assert(not (select is_featured or is_verified from public.businesses where name = 'Test Thattukada'), 'owners cannot feature/verify');
select pg_temp.assert((select owner_id from public.businesses where name = 'Test Thattukada') = '11111111-1111-1111-1111-111111111111', 'owner_id is forced to the caller');
select pg_temp.assert((select city_slug from public.businesses where name = 'Test Thattukada') = 'munich', 'city aliases map to canonical city slug');
select pg_temp.assert((select role from public.profiles where id = auth.uid()) = 'business_owner', 'submitting promotes user to business_owner');

update public.profiles set role = 'admin' where id = auth.uid();
select pg_temp.assert((select role from public.profiles where id = auth.uid()) = 'business_owner', 'users cannot change their own role');

update public.businesses set status = 'approved' where name = 'Test Thattukada';
select pg_temp.assert((select status from public.businesses where name = 'Test Thattukada') = 'pending', 'owners cannot approve their listing');

-- Other users cannot see or modify pending listings -------------------------
select pg_temp.login('22222222-2222-2222-2222-222222222222');
select pg_temp.assert((select count(*) from public.businesses where name = 'Test Thattukada') = 0, 'pending listings are hidden from other users');
update public.businesses set name = 'Hacked' where name = 'Test Thattukada';
reset role;
select pg_temp.assert((select count(*) from public.businesses where name = 'Hacked') = 0, 'other users cannot update listings');

-- Anonymous visitors ----------------------------------------------------------
set local role anon;
select pg_temp.login(null);
select pg_temp.assert((select count(*) from public.profiles) = 0, 'anon cannot read profiles');
select pg_temp.assert((select count(*) from public.business_owner_details) = 0, 'anon cannot read private owner details');
reset role;

-- Admin approves --------------------------------------------------------------
set local role authenticated;
select pg_temp.login('33333333-3333-3333-3333-333333333333');
update public.businesses set status = 'approved', is_verified = true where name = 'Test Thattukada';
select pg_temp.assert((select approved_at is not null and verified_at is not null from public.businesses where name = 'Test Thattukada'),
  'admin approval sets approved_at and verified_at');

-- Owner edits on published listings -------------------------------------------
select pg_temp.login('11111111-1111-1111-1111-111111111111');
do $$
begin
  update public.businesses set name = 'Renamed' where name = 'Test Thattukada';
  raise exception 'expected CHANGES_REQUIRE_REVIEW';
exception when others then
  if sqlerrm <> 'CHANGES_REQUIRE_REVIEW' then raise; end if;
end $$;
select pg_temp.assert(true, 'core changes on published listings require review');

update public.businesses set phone = '+49 89 1', pending_changes = '{"name":"Renamed"}' where name = 'Test Thattukada';
select pg_temp.assert((select phone = '+49 89 1' and pending_changes_submitted_at is not null from public.businesses where name = 'Test Thattukada'),
  'contact details update directly, core changes go to pending_changes');

-- Favourites, verification requests, cross-tenant child rows ------------------
insert into public.favourites (user_id, business_id) select auth.uid(), id from public.businesses where name = 'Test Thattukada';
select pg_temp.assert((select count(*) from public.favourites where user_id = auth.uid()) = 1, 'users can save favourites');

insert into public.business_verification_requests (business_id, status) select id, 'approved' from public.businesses where name = 'Test Thattukada';
select pg_temp.assert((select status from public.business_verification_requests limit 1) = 'pending', 'verification requests always start pending');

select pg_temp.login('22222222-2222-2222-2222-222222222222');
do $$
begin
  insert into public.business_opening_hours (business_id, day_of_week, opens_at, closes_at)
  select id, 1, '10:00', '18:00' from public.businesses where name = 'Test Thattukada';
  raise exception 'expected RLS violation';
exception when insufficient_privilege then null;
end $$;
select pg_temp.assert(true, 'users cannot modify other businesses'' opening hours');
select pg_temp.assert((select count(*) from public.favourites) = 0, 'users cannot read other users'' favourites');

reset role;
rollback;
