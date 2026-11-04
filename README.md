# MalluMarktplatz 🇮🇳🇩🇪

**Discover. Connect. Support.** — the home of Malayali businesses and professionals in Germany.

A community-driven business directory built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4,
shadcn/ui and Supabase (Postgres, Auth, Storage, Row Level Security).

## Features (Phase 1 MVP + parts of Phase 2)

| Area | What's included |
| --- | --- |
| Discovery | Homepage (hero search, categories, featured, recently added, cities, CTA), directory with keyword / category / city / postal code / verified filters, sorting, grid / list / **map** views, pagination, SEO URLs (`/businesses/munich/restaurants`) |
| Business pages | Logo, cover, description, services, gallery, opening hours with "open now", contact actions (call, email, website, WhatsApp, directions), social links, map, JSON-LD `LocalBusiness`, report / removal request |
| Registration | One-page form (only 8 required fields), direct-to-Storage image uploads, opening hours editor, consent capture, duplicate protection, saved as **pending** |
| Accounts | Email/password sign-up with email verification, login, password reset, logout; roles *visitor*, *user*, *business owner*, *admin* |
| User dashboard | Profile & language, favourites, password change, **GDPR data export** and **account deletion** |
| Owner dashboard | Listings with status, 30-day view stats, edit, request verification, delete; edits to core fields of published listings go through review |
| Admin | Overview stats, moderation (approve / reject with reason / suspend / reinstate), feature, verify, apply/discard pending changes, geocode, delete, managers, users & roles, categories (incl. subcategories), cities, reports, verification requests |
| i18n | English (default), German (complete for all public/user UI), Malayalam (public UI; falls back to English). Cookie-based, auto-detects `Accept-Language` |
| SEO | Dynamic metadata, Open Graph, canonical URLs, `sitemap.xml`, `robots.txt`, breadcrumb + LocalBusiness structured data |
| Privacy | No tracking cookies, cookieless Vercel Analytics, aggregated view counters (no IPs), private owner details, opt-in public owner name, optional hidden street address |

## Architecture

```
src/
  app/                    Routes (App Router). Public pages, /dashboard, /admin, auth route handlers
  actions/                Server Actions (auth, business, account, admin, public) – all validate input with zod
  components/             UI: layout, business, directory, forms, dashboard, admin, ui (shadcn)
  lib/
    supabase/             server / browser / admin clients, proxy session refresh, Database types
    data/                 Read queries (businesses, taxonomy, dashboard)
    validation/           zod schemas shared by forms and actions
    auth.ts               getCurrentUser / requireUser / requireAdmin (server-side gates)
  i18n/                   next-intl config (no locale prefix in URLs)
  proxy.ts                Session refresh + redirect of anonymous users away from /dashboard & /admin
messages/                 en.json (source of truth), de.json, ml.json
supabase/
  migrations/             Schema, RLS, triggers, storage bucket + policies, reference data
  seed.sql                Clearly labelled demo listings (local only)
  tests/rls.test.sql      Database security tests
tests/                    Vitest unit tests
```

### Security model

Authorization is enforced **in the database**, not only in the UI:

- **RLS on every table.** Public can read approved listings only; owners/managers can read and edit their own; admins everything.
- **Guard triggers** prevent privilege escalation through the public API: new listings are always `pending`,
  owners can never set `status`, `is_featured`, `is_verified`, `owner_id` or `slug`, users can't change their own role,
  and edits to core fields of a published listing raise `CHANGES_REQUIRE_REVIEW` unless stored in `pending_changes`.
- **Admin server actions** re-check the admin role before doing anything (`adminContext()` in `src/actions/admin.ts`).
- **Storage**: uploads go to `business-media/<user_id>/…`; policies only allow writing into your own folder.
- The **secret key** is used in exactly one place (account deletion) and lives in a `server-only` module.
- Redirect targets are restricted to same-origin paths; JSON-LD is escaped; external links use `rel="nofollow ugc noopener"`.

### Database

Tables: `profiles`, `business_categories` (with `parent_id` for subcategories), `cities` (with aliases, e.g.
München → munich), `businesses`, `business_owner_details` (private), `business_managers`, `business_images`,
`business_opening_hours`, `business_social_links`, `favourites`, `business_reviews` (schema only, future),
`business_reports`, `business_verification_requests`, `business_daily_views`.

Statuses: `pending → approved | rejected`, `approved ↔ suspended`, `rejected → pending` (owner resubmits).

## Environment variables

Copy `.env.example` to `.env.local`.

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Publishable/anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY` also accepted) |
| `SUPABASE_SECRET_KEY` | ✅ for account deletion | Secret/service-role key, **server only** |
| `NEXT_PUBLIC_SITE_URL` | ✅ in production | e.g. `https://mallumarktplatz.de` – used for canonical URLs, sitemap, JSON-LD |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | optional | Enables map view & business maps. Restrict it to your domains in Mapbox |
| `MAPBOX_GEOCODING_TOKEN` | optional | Server-side geocoding; falls back to city coordinates |
| `NEXT_PUBLIC_LEGAL_*`, `NEXT_PUBLIC_CONTACT_EMAIL` | ✅ before launch | Impressum / privacy details |
| `NEXT_PUBLIC_SOCIAL_*` | optional | Footer social links |

## Local development

Prerequisites: Node.js 22+, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
supabase start                 # starts Postgres, Auth, Storage, Mailpit on 127.0.0.1:543xx
supabase db reset              # applies migrations + seed.sql (demo listings)
supabase status                # copy "Publishable key" and "Secret key" into .env.local
cp .env.example .env.local     # then fill in the keys
npm run dev                    # http://localhost:3000
```

Confirmation and password reset emails are caught by Mailpit at <http://127.0.0.1:54324>.

**Create an admin:** register through the app, confirm the email, then

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
  -c "update public.profiles set role = 'admin' where email = 'you@example.com';"
```

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript |
| `npm test` | Unit tests (validation, slugs, contact links, opening hours, URL building, i18n catalogues, security helpers) |
| `npm run test:db` | Database RLS & trigger tests against the local Supabase DB |
| `npm run db:types` | Generate Supabase types (compare with `src/lib/supabase/database.types.ts`) |

## Deployment (Vercel + Supabase)

1. **Supabase**: create a project (EU region, e.g. Frankfurt), then link and push the schema:
   ```bash
   supabase link --project-ref <ref>
   supabase db push              # applies supabase/migrations (NOT seed.sql)
   ```
2. **Auth settings** (Dashboard → Authentication):
   - Site URL: `https://mallumarktplatz.de`; Redirect URLs: `https://mallumarktplatz.de/**` (+ preview URLs if needed).
   - Enable email confirmations and configure a custom SMTP provider for production email delivery.
   - Email templates: use the contents of `supabase/templates/confirmation.html` and `recovery.html`
     (token-hash links to `/auth/confirm`). The default templates also work via `/auth/callback`.
3. **Vercel**: import the repository, add the environment variables above (Production + Preview), deploy.
4. **Domain**: add `mallumarktplatz.de` in Vercel, set `NEXT_PUBLIC_SITE_URL`, update Supabase Site URL.
5. **Analytics**: enable Web Analytics in the Vercel project (cookieless).
6. **Before launch**: fill in the Impressum/privacy details, have the legal texts reviewed, and remove
   `LegalTemplateNotice`.

## Logging & tracing

Every request is traced with **OpenTelemetry** (`src/instrumentation.ts`, via `@vercel/otel`), and every log line
is **structured JSON** stamped with the active `trace_id` / `span_id` (`src/lib/logger.ts`).

| What | Where |
| --- | --- |
| Request spans (route, status), render spans, outgoing `fetch` spans (every Supabase/Mapbox call) | automatic (Next.js + `@vercel/otel`) |
| One span + one log line per Server Action (`action business.saveBusiness`, outcome, duration, user id) | `traceAction()` in `src/lib/telemetry.ts`, applied to all exports in `src/actions/*` |
| Underlying causes (Postgres error codes, RLS violations, auth error codes) | `logger.warn/error(...)` at each failure site |
| Uncaught server errors with `digest`, route and trace id | `onRequestError` in `src/instrumentation.ts` |
| User-facing reference | Failed actions return `reference` (first 16 chars of the trace id); the error page shows the `digest`. Both are searchable in logs |

Logs redact passwords, tokens, cookies, emails and phone numbers; users are identified by their UUID (`enduser.id`).

**Local trace viewer (Jaeger):**

```bash
docker compose -f observability/docker-compose.yml up -d
echo "OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318" >> .env.local   # then restart npm run dev
open http://localhost:16686            # service "mallumarktplatz", or search by trace id from a log line
```

**Production:** on Vercel, traces appear in Observability and can be forwarded to tracing integrations
(Datadog, New Relic, Grafana, …); JSON logs are searchable by `trace_id` in Vercel Logs or a Log Drain.
Elsewhere, point `OTEL_EXPORTER_OTLP_ENDPOINT` (+ `OTEL_EXPORTER_OTLP_HEADERS`) at any OTLP backend.
Use `OTEL_TRACES_SAMPLER=parentbased_traceidratio` and `OTEL_TRACES_SAMPLER_ARG=0.2` to sample under high traffic.

**Debugging a user report:** take the reference/digest → search logs for it → copy `trace_id` → open the trace to
see the request, the action, each Supabase call with its status, and the recorded exception.

## Notes & design decisions

- **Moderation first**: nothing is published automatically; "Verified" is only set by an admin after real checks.
- **Demo data** exists only in `supabase/seed.sql`, is flagged `is_demo`, labelled "[Demo]" and shows a badge.
- **Cache Components** (`cacheComponents`) are disabled: almost every page depends on the auth/locale cookie, so
  dynamic rendering is simpler and correct. Revisit for heavily-trafficked public pages later.
- **Malayalam** translations cover the public UI and should be reviewed by a native speaker; missing keys fall back to English.
- **Unused uploads**: images removed from a form before saving can remain in Storage; a periodic cleanup job is a
  good follow-up.

## Roadmap

Phase 2: reviews & ratings (table already exists), verification document upload, email notifications to owners on
approval/rejection. Phase 3: jobs, events, housing, classifieds, premium/sponsored listings, other EU countries
(`country_code` columns are already in place).
# mallumarktplatz
