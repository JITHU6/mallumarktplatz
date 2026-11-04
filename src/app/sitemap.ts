import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

export const revalidate = 3600;

/** Sitemap of static pages, categories, cities and all approved business pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl;
  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/businesses",
    "/categories",
    "/about",
    "/contact",
    "/register-business",
    "/privacy",
    "/terms",
    "/impressum",
  ].map((p) => ({ url: `${base}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.6 }));

  if (!env.supabaseUrl || !env.supabasePublishableKey) return staticPages;

  // Cookie-less anonymous client: only public (approved) data is visible through RLS.
  const supabase = createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    auth: { persistSession: false },
  });
  const [{ data: businesses }, { data: categories }, { data: cities }] = await Promise.all([
    supabase.from("businesses").select("slug, updated_at").eq("status", "approved").limit(45000),
    supabase.from("business_categories").select("slug, updated_at").eq("is_active", true),
    supabase.rpc("city_business_counts"),
  ]);

  return [
    ...staticPages,
    ...(categories ?? []).map((c) => ({
      url: `${base}/categories/${c.slug}`,
      lastModified: c.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...(cities ?? []).map((c) => ({
      url: `${base}/businesses/${c.city_slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...(businesses ?? []).map((b) => ({
      url: `${base}/business/${b.slug}`,
      lastModified: b.updated_at,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
