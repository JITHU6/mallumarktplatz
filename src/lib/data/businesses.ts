import "server-only";
import { cache } from "react";
import { PAGE_SIZE } from "@/config/site";
import { pageRange, searchTerms, type DirectoryParams } from "@/lib/directory-params";
import { createClient } from "@/lib/supabase/server";
import { getCategoryFamilyIds } from "./taxonomy";

export const CARD_SELECT = `
  id, slug, name, short_description, city, city_slug, postal_code, logo_path, cover_image_path,
  is_verified, is_featured, is_demo, latitude, longitude, created_at, status,
  category:business_categories!businesses_category_id_fkey ( slug, name, name_translations, icon )
` as const;

export type BusinessCardData = Awaited<ReturnType<typeof getRecentBusinesses>>[number];

export type SearchResult = {
  items: BusinessCardData[];
  total: number;
  page: number;
  totalPages: number;
};

export async function searchBusinesses(
  params: DirectoryParams,
  options: { mapMode?: boolean } = {},
): Promise<SearchResult> {
  const supabase = await createClient();
  let query = supabase.from("businesses").select(CARD_SELECT, { count: "exact" }).eq("status", "approved");

  for (const term of searchTerms(params.q)) {
    query = query.ilike("search_text", `%${term}%`);
  }

  if (params.category) {
    const ids = await getCategoryFamilyIds(params.category);
    if (!ids) return { items: [], total: 0, page: 1, totalPages: 1 };
    const list = ids.join(",");
    query = query.or(`category_id.in.(${list}),subcategory_id.in.(${list})`);
  }
  if (params.city) query = query.eq("city_slug", params.city);
  if (params.postalCode) query = query.like("postal_code", `${params.postalCode}%`);
  if (params.verified) query = query.eq("is_verified", true);

  switch (params.sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query
        .order("is_featured", { ascending: false })
        .order("is_verified", { ascending: false })
        .order("approved_at", { ascending: false, nullsFirst: false });
  }
  query = query.order("id");

  if (options.mapMode) {
    const { data, count, error } = await query.not("latitude", "is", null).limit(500);
    if (error) throw error;
    return { items: data ?? [], total: count ?? 0, page: 1, totalPages: 1 };
  }

  // First pass gets the count; clamp the page so out-of-range pages show the last page.
  const { from, to } = pageRange(params.page, Number.MAX_SAFE_INTEGER, PAGE_SIZE);
  const { data, count, error } = await query.range(from, to);
  if (error && error.code !== "PGRST103") throw error; // PGRST103 = requested range not satisfiable
  const total = count ?? 0;
  const range = pageRange(params.page, total, PAGE_SIZE);
  if ((data?.length ?? 0) === 0 && total > 0 && range.current !== params.page) {
    return searchBusinesses({ ...params, page: range.current }, options);
  }
  return { items: data ?? [], total, page: range.current, totalPages: range.totalPages };
}

export const getFeaturedBusinesses = cache(async (limit = 6) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(CARD_SELECT)
    .eq("status", "approved")
    .eq("is_featured", true)
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
});

export const getRecentBusinesses = cache(async (limit = 6) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(CARD_SELECT)
    .eq("status", "approved")
    .order("approved_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
});

const DETAIL_SELECT = `
  *,
  category:business_categories!businesses_category_id_fkey ( id, slug, name, name_translations, icon ),
  subcategory:business_categories!businesses_subcategory_id_fkey ( id, slug, name, name_translations ),
  images:business_images ( id, storage_path, alt_text, sort_order ),
  hours:business_opening_hours ( day_of_week, opens_at, closes_at, is_closed ),
  social:business_social_links ( platform, url )
` as const;

/** Returns an approved business, or a non-approved one the current user may manage (RLS). */
export const getBusinessBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("businesses").select(DETAIL_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    images: [...(data.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    hours: [...(data.hours ?? [])].sort((a, b) => a.day_of_week - b.day_of_week),
  };
});

export type BusinessDetail = NonNullable<Awaited<ReturnType<typeof getBusinessBySlug>>>;

/** Full editable data for the owner/admin edit form (RLS restricts access). */
export async function getBusinessForEdit(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select(
      `${DETAIL_SELECT}, owner_details:business_owner_details ( owner_name, contact_email, contact_phone )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    ...data,
    images: [...(data.images ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    hours: [...(data.hours ?? [])].sort((a, b) => a.day_of_week - b.day_of_week),
  };
}

export type BusinessForEdit = NonNullable<Awaited<ReturnType<typeof getBusinessForEdit>>>;
