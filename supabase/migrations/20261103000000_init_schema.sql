-- =============================================================================
-- MalluMarktplatz – initial schema
-- Directory of Malayali-owned businesses in Germany (expandable to other
-- European countries via country_code columns).
-- =============================================================================

create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('user', 'business_owner', 'admin');
create type public.business_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.social_platform as enum ('instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x');
create type public.report_reason as enum ('incorrect_information', 'closed_permanently', 'not_malayali_owned', 'inappropriate_content', 'spam', 'privacy', 'removal_request', 'other');
create type public.report_status as enum ('open', 'resolved', 'dismissed');
create type public.verification_status as enum ('pending', 'approved', 'rejected');
create type public.review_status as enum ('pending', 'approved', 'rejected');

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------

-- Must stay in sync with src/lib/slug.ts
create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select trim(both '-' from regexp_replace(
    translate(
      replace(replace(replace(replace(lower(coalesce(value, '')), 'ä', 'ae'), 'ö', 'oe'), 'ü', 'ue'), 'ß', 'ss'),
      'áàâãåéèêëíìîïóòôõúùûçñ',
      'aaaaaeeeeiiiioooouuucn'
    ),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- True when the current request comes from an end user through the Data API
-- (anon/authenticated roles). Service-role, migrations and SECURITY DEFINER
-- functions run as privileged roles and bypass the guard triggers.
create or replace function public.is_api_user()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user in ('anon', 'authenticated');
$$;

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  role public.user_role not null default 'user',
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'de', 'ml')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Users cannot change their own role or email through the API.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_api_user() and not public.is_admin() then
    new.role := old.role;
    new.email := old.email;
  end if;
  return new;
end;
$$;

create trigger profiles_guard
before update on public.profiles
for each row execute function public.profiles_guard();

-- Create a profile for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120), '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.handle_user_email_change();

-- -----------------------------------------------------------------------------
-- Categories (extensible by admins, supports one level of subcategories)
-- -----------------------------------------------------------------------------
create table public.business_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.business_categories (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  -- Optional translations, e.g. {"de": "Restaurants", "ml": "..."}
  name_translations jsonb not null default '{}'::jsonb,
  description text,
  icon text not null default 'briefcase',
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_categories_parent_idx on public.business_categories (parent_id);

create trigger business_categories_set_updated_at
before update on public.business_categories
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Cities (curated locations for discovery; businesses are NOT restricted to
-- this list – unknown cities get a slug automatically)
-- -----------------------------------------------------------------------------
create table public.cities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_translations jsonb not null default '{}'::jsonb,
  -- Alternative spellings that map to this city (e.g. München -> Munich)
  aliases text[] not null default '{}',
  state text,
  country_code char(2) not null default 'DE',
  latitude double precision,
  longitude double precision,
  is_featured boolean not null default false,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger cities_set_updated_at
before update on public.cities
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Businesses
-- -----------------------------------------------------------------------------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles (id) on delete cascade,
  slug text not null unique,
  status public.business_status not null default 'pending',
  rejection_reason text,

  name text not null check (char_length(name) between 2 and 120),
  category_id uuid not null references public.business_categories (id) on delete restrict,
  subcategory_id uuid references public.business_categories (id) on delete set null,
  short_description text not null check (char_length(short_description) between 10 and 200),
  description text check (char_length(description) <= 5000),
  services text[] not null default '{}',

  -- Only populated when the owner explicitly agreed to show their name publicly.
  owner_display_name text check (char_length(owner_display_name) <= 120),

  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 40),
  whatsapp text check (char_length(whatsapp) <= 40),
  website text check (char_length(website) <= 300),

  address_line text check (char_length(address_line) <= 200),
  hide_street_address boolean not null default false,
  postal_code text not null check (char_length(postal_code) between 3 and 10),
  city text not null check (char_length(city) between 2 and 100),
  city_slug text not null,
  bundesland text,
  country_code char(2) not null default 'DE',
  latitude double precision,
  longitude double precision,

  logo_path text,
  cover_image_path text,

  is_featured boolean not null default false,
  is_verified boolean not null default false,
  verified_at timestamptz,
  -- Clearly labelled sample data for local development / demos.
  is_demo boolean not null default false,

  -- Changes to core fields of an approved listing that await admin review.
  pending_changes jsonb,
  pending_changes_submitted_at timestamptz,

  publish_consent_at timestamptz not null default now(),
  approved_at timestamptz,
  search_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_status_idx on public.businesses (status);
create index businesses_owner_idx on public.businesses (owner_id);
create index businesses_category_idx on public.businesses (category_id);
create index businesses_subcategory_idx on public.businesses (subcategory_id);
create index businesses_city_slug_idx on public.businesses (city_slug);
create index businesses_postal_code_idx on public.businesses (postal_code text_pattern_ops);
create index businesses_featured_idx on public.businesses (is_featured) where status = 'approved';
create index businesses_approved_created_idx on public.businesses (created_at desc) where status = 'approved';
create index businesses_search_trgm_idx on public.businesses using gin (search_text extensions.gin_trgm_ops);
-- Duplicate submission protection: same name at the same postal code.
create unique index businesses_unique_name_postal_idx
  on public.businesses (lower(name), postal_code)
  where status <> 'rejected';

-- Generates a unique slug. SECURITY DEFINER so it can see rows hidden by RLS.
create or replace function public.unique_business_slug(p_name text, p_city text, p_exclude uuid default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  base text := public.slugify(p_name || ' ' || coalesce(p_city, ''));
  candidate text;
  n integer := 1;
begin
  if base = '' then
    base := 'business';
  end if;
  base := left(base, 80);
  candidate := base;
  while exists (
    select 1 from public.businesses
    where slug = candidate and (p_exclude is null or id <> p_exclude)
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- Derived columns: city slug (canonicalised through cities/aliases) and search text.
create or replace function public.businesses_derive()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  c record;
  cat_names text;
begin
  new.city := trim(new.city);
  new.postal_code := upper(trim(new.postal_code));

  select ci.slug, ci.name into c
  from public.cities ci
  where lower(ci.name) = lower(new.city)
     or exists (select 1 from unnest(ci.aliases) a where lower(a) = lower(new.city))
  limit 1;

  if found then
    new.city_slug := c.slug;
  else
    new.city_slug := public.slugify(new.city);
  end if;

  select string_agg(concat_ws(' ', bc.name, bc.name_translations ->> 'de', bc.name_translations ->> 'ml'), ' ')
  into cat_names
  from public.business_categories bc
  where bc.id in (new.category_id, new.subcategory_id);

  new.search_text := lower(concat_ws(' ',
    new.name, new.short_description, new.description,
    array_to_string(new.services, ' '),
    new.city, c.name, new.postal_code, new.bundesland, cat_names
  ));

  return new;
end;
$$;

create trigger businesses_derive
before insert or update on public.businesses
for each row execute function public.businesses_derive();

-- Enforces the moderation workflow for non-admin users.
create or replace function public.businesses_guard_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  pending_count integer;
begin
  if public.is_api_user() and not public.is_admin() then
    new.owner_id := auth.uid();
    new.status := 'pending';
    new.rejection_reason := null;
    new.is_featured := false;
    new.is_verified := false;
    new.verified_at := null;
    new.is_demo := false;
    new.pending_changes := null;
    new.pending_changes_submitted_at := null;
    new.approved_at := null;
    new.publish_consent_at := now();

    select count(*) into pending_count
    from public.businesses
    where owner_id = auth.uid() and status = 'pending';
    if pending_count >= 5 then
      raise exception 'TOO_MANY_PENDING_SUBMISSIONS' using errcode = 'P0001';
    end if;
  end if;

  new.slug := public.unique_business_slug(new.name, new.city_slug);
  return new;
end;
$$;

create trigger businesses_guard_insert
before insert on public.businesses
for each row execute function public.businesses_guard_insert();

create or replace function public.businesses_guard_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_api_user() and not public.is_admin() then
    -- Privileged columns are read-only for owners/managers.
    new.owner_id := old.owner_id;
    new.slug := old.slug;
    new.is_featured := old.is_featured;
    new.is_verified := old.is_verified;
    new.verified_at := old.verified_at;
    new.is_demo := old.is_demo;
    new.approved_at := old.approved_at;
    new.created_at := old.created_at;
    new.publish_consent_at := old.publish_consent_at;
    new.latitude := old.latitude;
    new.longitude := old.longitude;

    -- Only allowed status transition: rejected -> pending (resubmission).
    if not (old.status = 'rejected' and new.status = 'pending') then
      new.status := old.status;
      new.rejection_reason := old.rejection_reason;
    else
      new.rejection_reason := null;
    end if;

    -- Core fields of a published (or suspended) listing must go through review
    -- via pending_changes.
    if old.status in ('approved', 'suspended') and (
      new.name is distinct from old.name or
      new.category_id is distinct from old.category_id or
      new.subcategory_id is distinct from old.subcategory_id or
      new.short_description is distinct from old.short_description or
      new.description is distinct from old.description or
      new.owner_display_name is distinct from old.owner_display_name or
      new.address_line is distinct from old.address_line or
      new.postal_code is distinct from old.postal_code or
      new.city is distinct from old.city or
      new.bundesland is distinct from old.bundesland or
      new.logo_path is distinct from old.logo_path or
      new.cover_image_path is distinct from old.cover_image_path
    ) then
      raise exception 'CHANGES_REQUIRE_REVIEW' using errcode = 'P0001';
    end if;

    if new.pending_changes is distinct from old.pending_changes then
      new.pending_changes_submitted_at := case when new.pending_changes is null then null else now() end;
    end if;
  end if;

  if new.status = 'approved' and old.status is distinct from 'approved' and new.approved_at is null then
    new.approved_at := now();
  end if;
  if new.is_verified and not old.is_verified then
    new.verified_at := now();
  elsif not new.is_verified then
    new.verified_at := null;
  end if;
  if new.name is distinct from old.name or new.city_slug is distinct from old.city_slug then
    new.slug := public.unique_business_slug(new.name, new.city_slug, new.id);
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger businesses_guard_update
before update on public.businesses
for each row execute function public.businesses_guard_update();

-- Promote a user to business_owner once they submit their first listing.
create or replace function public.promote_business_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not null then
    update public.profiles
    set role = 'business_owner'
    where id = new.owner_id and role = 'user';
  end if;
  return new;
end;
$$;

create trigger businesses_promote_owner
after insert on public.businesses
for each row execute function public.promote_business_owner();

-- -----------------------------------------------------------------------------
-- Additional managers of a business (explicit authorisation by admins)
-- -----------------------------------------------------------------------------
create table public.business_managers (
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index business_managers_user_idx on public.business_managers (user_id);

create or replace function public.can_manage_business(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = auth.uid()
  ) or exists (
    select 1 from public.business_managers m
    where m.business_id = p_business_id and m.user_id = auth.uid()
  );
$$;


-- -----------------------------------------------------------------------------
-- Private owner/contact details (never public)
-- -----------------------------------------------------------------------------
create table public.business_owner_details (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  owner_name text not null check (char_length(owner_name) between 2 and 120),
  contact_email text check (char_length(contact_email) <= 254),
  contact_phone text check (char_length(contact_phone) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger business_owner_details_set_updated_at
before update on public.business_owner_details
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Images, opening hours, social links
-- -----------------------------------------------------------------------------
create table public.business_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  storage_path text not null,
  alt_text text check (char_length(alt_text) <= 200),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index business_images_business_idx on public.business_images (business_id, sort_order);

create table public.business_opening_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- ISO day of week: 1 = Monday … 7 = Sunday
  day_of_week smallint not null check (day_of_week between 1 and 7),
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  unique (business_id, day_of_week),
  check (is_closed or (opens_at is not null and closes_at is not null))
);

create table public.business_social_links (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  platform public.social_platform not null,
  url text not null check (url ~* '^https://' and char_length(url) <= 300),
  unique (business_id, platform)
);

-- -----------------------------------------------------------------------------
-- Favourites
-- -----------------------------------------------------------------------------
create table public.favourites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, business_id)
);

create index favourites_business_idx on public.favourites (business_id);

-- -----------------------------------------------------------------------------
-- Reviews (future feature – schema only, not exposed in the MVP UI)
-- -----------------------------------------------------------------------------
create table public.business_reviews (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 2000),
  status public.review_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

create trigger business_reviews_set_updated_at
before update on public.business_reviews
for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Reports (incl. GDPR listing removal requests)
-- -----------------------------------------------------------------------------
create table public.business_reports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reporter_email text check (char_length(reporter_email) <= 254),
  reason public.report_reason not null,
  details text check (char_length(details) <= 2000),
  status public.report_status not null default 'open',
  admin_notes text,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index business_reports_status_idx on public.business_reports (status, created_at desc);

create or replace function public.business_reports_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_api_user() and not public.is_admin() then
    new.status := 'open';
    new.admin_notes := null;
    new.resolved_at := null;
    new.reporter_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger business_reports_guard
before insert on public.business_reports
for each row execute function public.business_reports_guard();

-- -----------------------------------------------------------------------------
-- Verification requests
-- -----------------------------------------------------------------------------
create table public.business_verification_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  requested_by uuid references public.profiles (id) on delete set null,
  message text check (char_length(message) <= 2000),
  status public.verification_status not null default 'pending',
  admin_notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index business_verification_requests_status_idx
  on public.business_verification_requests (status, created_at desc);
create unique index business_verification_requests_one_pending_idx
  on public.business_verification_requests (business_id)
  where status = 'pending';

create or replace function public.verification_requests_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_api_user() and not public.is_admin() then
    new.status := 'pending';
    new.admin_notes := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.requested_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger verification_requests_guard
before insert on public.business_verification_requests
for each row execute function public.verification_requests_guard();

-- -----------------------------------------------------------------------------
-- Privacy-friendly view statistics: daily counters only, no IPs or user ids.
-- -----------------------------------------------------------------------------
create table public.business_daily_views (
  business_id uuid not null references public.businesses (id) on delete cascade,
  day date not null default current_date,
  views integer not null default 0,
  primary key (business_id, day)
);

create or replace function public.record_business_view(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.businesses where id = p_business_id and status = 'approved') then
    insert into public.business_daily_views (business_id, day, views)
    values (p_business_id, current_date, 1)
    on conflict (business_id, day)
    do update set views = public.business_daily_views.views + 1;
  end if;
end;
$$;

-- Public counts per city for "Explore by city".
create or replace function public.city_business_counts()
returns table (city_slug text, city text, business_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select b.city_slug, min(b.city), count(*)
  from public.businesses b
  where b.status = 'approved'
  group by b.city_slug;
$$;

create or replace function public.category_business_counts()
returns table (category_id uuid, business_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, count(b.id)
  from public.business_categories c
  left join public.businesses b
    on b.status = 'approved' and (b.category_id = c.id or b.subcategory_id = c.id)
  group by c.id;
$$;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles enable row level security;
alter table public.business_categories enable row level security;
alter table public.cities enable row level security;
alter table public.businesses enable row level security;
alter table public.business_managers enable row level security;
alter table public.business_owner_details enable row level security;
alter table public.business_images enable row level security;
alter table public.business_opening_hours enable row level security;
alter table public.business_social_links enable row level security;
alter table public.favourites enable row level security;
alter table public.business_reviews enable row level security;
alter table public.business_reports enable row level security;
alter table public.business_verification_requests enable row level security;
alter table public.business_daily_views enable row level security;

-- profiles
create policy "Profiles: read own or admin" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Profiles: update own or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

-- categories
create policy "Categories: public read active" on public.business_categories
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "Categories: admin insert" on public.business_categories
  for insert to authenticated with check ((select public.is_admin()));
create policy "Categories: admin update" on public.business_categories
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Categories: admin delete" on public.business_categories
  for delete to authenticated using ((select public.is_admin()));

-- cities
create policy "Cities: public read active" on public.cities
  for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy "Cities: admin insert" on public.cities
  for insert to authenticated with check ((select public.is_admin()));
create policy "Cities: admin update" on public.cities
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Cities: admin delete" on public.cities
  for delete to authenticated using ((select public.is_admin()));

-- businesses
create policy "Businesses: public read approved" on public.businesses
  for select to anon, authenticated
  using (status = 'approved' or public.can_manage_business(id));
create policy "Businesses: authenticated insert own" on public.businesses
  for insert to authenticated
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "Businesses: managers update" on public.businesses
  for update to authenticated
  using (public.can_manage_business(id))
  with check (public.can_manage_business(id));
create policy "Businesses: owner or admin delete" on public.businesses
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

-- business_managers
create policy "Managers: read own or manageable" on public.business_managers
  for select to authenticated
  using (user_id = (select auth.uid()) or public.can_manage_business(business_id));
create policy "Managers: admin insert" on public.business_managers
  for insert to authenticated with check ((select public.is_admin()));
create policy "Managers: admin delete" on public.business_managers
  for delete to authenticated using ((select public.is_admin()));

-- business_owner_details (private)
create policy "Owner details: managers read" on public.business_owner_details
  for select to authenticated using (public.can_manage_business(business_id));
create policy "Owner details: managers insert" on public.business_owner_details
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "Owner details: managers update" on public.business_owner_details
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));

-- images / opening hours / social links: visible when the parent business is visible
create policy "Images: read with business" on public.business_images
  for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "Images: managers insert" on public.business_images
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "Images: managers update" on public.business_images
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));
create policy "Images: managers delete" on public.business_images
  for delete to authenticated using (public.can_manage_business(business_id));

create policy "Hours: read with business" on public.business_opening_hours
  for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "Hours: managers insert" on public.business_opening_hours
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "Hours: managers update" on public.business_opening_hours
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));
create policy "Hours: managers delete" on public.business_opening_hours
  for delete to authenticated using (public.can_manage_business(business_id));

create policy "Social: read with business" on public.business_social_links
  for select to anon, authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id));
create policy "Social: managers insert" on public.business_social_links
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "Social: managers update" on public.business_social_links
  for update to authenticated
  using (public.can_manage_business(business_id))
  with check (public.can_manage_business(business_id));
create policy "Social: managers delete" on public.business_social_links
  for delete to authenticated using (public.can_manage_business(business_id));

-- favourites
create policy "Favourites: read own" on public.favourites
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Favourites: insert own" on public.favourites
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.businesses b where b.id = business_id and b.status = 'approved')
  );
create policy "Favourites: delete own" on public.favourites
  for delete to authenticated using (user_id = (select auth.uid()));

-- reviews (future)
create policy "Reviews: public read approved" on public.business_reviews
  for select to anon, authenticated
  using (status = 'approved' or user_id = (select auth.uid()) or (select public.is_admin()));
create policy "Reviews: insert own" on public.business_reviews
  for insert to authenticated with check (user_id = (select auth.uid()) and status = 'pending');
create policy "Reviews: admin update" on public.business_reviews
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Reviews: own or admin delete" on public.business_reviews
  for delete to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- reports: anyone may report an approved listing; only admins read/manage.
create policy "Reports: anyone insert" on public.business_reports
  for insert to anon, authenticated
  with check (exists (select 1 from public.businesses b where b.id = business_id));
create policy "Reports: admin read" on public.business_reports
  for select to authenticated using ((select public.is_admin()));
create policy "Reports: admin update" on public.business_reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Reports: admin delete" on public.business_reports
  for delete to authenticated using ((select public.is_admin()));

-- verification requests
create policy "Verification: managers read" on public.business_verification_requests
  for select to authenticated using (public.can_manage_business(business_id));
create policy "Verification: managers insert" on public.business_verification_requests
  for insert to authenticated with check (public.can_manage_business(business_id));
create policy "Verification: admin update" on public.business_verification_requests
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- daily views: managers can read; writes only through record_business_view()
create policy "Views: managers read" on public.business_daily_views
  for select to authenticated using (public.can_manage_business(business_id));

-- Function privileges
revoke all on function public.record_business_view(uuid) from public;
grant execute on function public.record_business_view(uuid) to anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.handle_user_email_change() from public, anon, authenticated;
revoke all on function public.promote_business_owner() from public, anon, authenticated;

-- =============================================================================
-- Storage: public bucket for business media.
-- Files live under "<user_id>/<business_id>/<file>" so ownership is checkable.
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('business-media', 'business-media', true, 5242880,
        array['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "Business media: owners upload to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'business-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
create policy "Business media: owners read own files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'business-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
create policy "Business media: owners update own files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'business-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
create policy "Business media: owners delete own files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'business-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );
