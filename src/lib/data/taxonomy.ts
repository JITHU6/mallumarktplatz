import "server-only";
import { cache } from "react";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/server";
import type { Category, City } from "@/lib/supabase/database.types";

export type CategoryWithCount = Category & { businessCount: number };

export const getCategories = cache(async (): Promise<CategoryWithCount[]> => {
  const supabase = await createClient();
  const [{ data: categories, error }, { data: counts }] = await Promise.all([
    supabase.from("business_categories").select("*").eq("is_active", true).order("sort_order").order("name"),
    supabase.rpc("category_business_counts"),
  ]);
  if (error) throw error;
  const countMap = new Map((counts ?? []).map((c) => [c.category_id, Number(c.business_count)]));
  return (categories ?? []).map((c) => ({ ...c, businessCount: countMap.get(c.id) ?? 0 }));
});

export async function getCategoryBySlug(slug: string) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug) ?? null;
}

/** Category plus its direct subcategories (used for filtering). */
export async function getCategoryFamilyIds(slug: string): Promise<string[] | null> {
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) return null;
  return [category.id, ...categories.filter((c) => c.parent_id === category.id).map((c) => c.id)];
}

export type CityWithCount = Pick<
  City,
  "slug" | "name" | "name_translations" | "aliases" | "state" | "latitude" | "longitude"
> & {
  businessCount: number;
  isFeatured: boolean;
};

/**
 * Curated cities merged with every city that currently has approved listings,
 * so new locations appear automatically.
 */
export const getCities = cache(async (): Promise<CityWithCount[]> => {
  const supabase = await createClient();
  const [{ data: cities, error }, { data: counts }] = await Promise.all([
    supabase.from("cities").select("*").eq("is_active", true).order("sort_order").order("name"),
    supabase.rpc("city_business_counts"),
  ]);
  if (error) throw error;

  const countMap = new Map((counts ?? []).map((c) => [c.city_slug, c]));
  const result: CityWithCount[] = (cities ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    name_translations: c.name_translations,
    aliases: c.aliases,
    state: c.state,
    latitude: c.latitude,
    longitude: c.longitude,
    isFeatured: c.is_featured,
    businessCount: Number(countMap.get(c.slug)?.business_count ?? 0),
  }));
  const known = new Set(result.map((c) => c.slug));
  for (const c of counts ?? []) {
    if (!known.has(c.city_slug)) {
      result.push({
        slug: c.city_slug,
        name: c.city,
        name_translations: {},
        aliases: [],
        state: null,
        latitude: null,
        longitude: null,
        isFeatured: false,
        businessCount: Number(c.business_count),
      });
    }
  }
  return result;
});

export async function getCityBySlug(slug: string) {
  const cities = await getCities();
  return cities.find((c) => c.slug === slug) ?? null;
}

/** Resolves free text like "München", "Munich" or "muenchen" to a known city slug. */
export async function resolveCitySlug(text: string): Promise<string | null> {
  const wanted = slugify(text);
  if (!wanted) return null;
  const cities = await getCities();
  const match = cities.find(
    (c) =>
      c.slug === wanted ||
      slugify(c.name) === wanted ||
      c.aliases.some((a) => slugify(a) === wanted) ||
      Object.values((c.name_translations as Record<string, string>) ?? {}).some(
        (n) => typeof n === "string" && slugify(n) === wanted,
      ),
  );
  return match?.slug ?? null;
}
