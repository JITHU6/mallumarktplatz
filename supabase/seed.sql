-- =============================================================================
-- LOCAL DEVELOPMENT ONLY – clearly labelled demo listings.
-- These are fictional businesses (is_demo = true) and are displayed with a
-- "Demo listing" badge. Do NOT run this file against production.
-- =============================================================================

insert into public.businesses (
  name, category_id, short_description, description, services,
  email, phone, website, address_line, postal_code, city, bundesland,
  latitude, longitude, status, is_featured, is_demo, approved_at
)
select
  d.name,
  (select id from public.business_categories where slug = d.category),
  d.short_description, d.description, d.services,
  d.email, d.phone, d.website, d.address_line, d.postal_code, d.city, d.bundesland,
  d.lat, d.lng, 'approved', d.featured, true, now() - d.age
from (values
  ('[Demo] Kerala Spice Kitchen', 'restaurants', 'Fictional demo restaurant serving Kerala-style meals and weekend sadya.', 'This is a demo listing used for local development. It does not represent a real business.', array['Kerala meals','Catering','Weekend sadya'], 'demo-kitchen@example.com', '+49 89 0000000', 'https://example.com', 'Demostraße 1', '80331', 'München', 'Bayern', 48.137, 11.575, true, interval '2 days'),
  ('[Demo] Malabar Grocery Store', 'grocery', 'Fictional demo shop for South Indian groceries and spices.', 'This is a demo listing used for local development. It does not represent a real business.', array['Spices','Rice','Snacks'], 'demo-grocery@example.com', '+49 30 0000000', null, 'Beispielweg 5', '10115', 'Berlin', 'Berlin', 52.531, 13.384, true, interval '5 days'),
  ('[Demo] Backwaters Tax Advisory', 'tax-accounting', 'Fictional demo tax consultancy for employees and freelancers.', 'This is a demo listing used for local development. It does not represent a real business.', array['Tax returns','Freelancer bookkeeping'], 'demo-tax@example.com', null, 'https://example.com', null, '60311', 'Frankfurt am Main', 'Hessen', 50.111, 8.682, true, interval '1 day'),
  ('[Demo] Coconut Code IT Solutions', 'it-software', 'Fictional demo IT consultancy for web and cloud projects.', 'This is a demo listing used for local development. It does not represent a real business.', array['Web development','Cloud consulting'], 'demo-it@example.com', null, 'https://example.com', null, '70173', 'Stuttgart', 'Baden-Württemberg', 48.776, 9.183, false, interval '3 hours'),
  ('[Demo] Monsoon Travels', 'travel', 'Fictional demo travel agency for flights between Germany and Kerala.', 'This is a demo listing used for local development. It does not represent a real business.', array['Flight booking','Holiday packages'], 'demo-travel@example.com', '+49 40 0000000', null, 'Musterallee 9', '20095', 'Hamburg', 'Hamburg', 53.551, 9.994, false, interval '8 days'),
  ('[Demo] Ayur Wellness Studio', 'beauty-wellness', 'Fictional demo wellness studio offering Ayurveda-inspired treatments.', 'This is a demo listing used for local development. It does not represent a real business.', array['Massage','Wellness consultation'], 'demo-wellness@example.com', null, null, null, '50667', 'Köln', 'Nordrhein-Westfalen', 50.938, 6.960, false, interval '12 days')
) as d(name, category, short_description, description, services, email, phone, website, address_line, postal_code, city, bundesland, lat, lng, featured, age)
on conflict do nothing;

insert into public.business_opening_hours (business_id, day_of_week, opens_at, closes_at, is_closed)
select b.id, d, case when d = 7 then null else time '11:00' end, case when d = 7 then null else time '21:00' end, d = 7
from public.businesses b
cross join generate_series(1, 7) as d
where b.is_demo
on conflict do nothing;

-- To create a local admin: sign up through the app, then run
--   update public.profiles set role = 'admin' where email = 'you@example.com';
