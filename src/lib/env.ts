/**
 * Public (browser-safe) environment configuration.
 * Server-only secrets live in src/lib/supabase/admin.ts and are never imported
 * from client components.
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  mapboxToken: process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "",
} as const;

export function assertSupabaseEnv() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error(
      "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example).",
    );
  }
}
