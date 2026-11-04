import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Businesses the user owns or manages (RLS also enforces this). */
export async function getManagedBusinesses(userId: string) {
  const supabase = await createClient();
  const { data: managerRows } = await supabase.from("business_managers").select("business_id").eq("user_id", userId);
  const managed = (managerRows ?? []).map((m) => m.business_id);
  const filter = managed.length ? `owner_id.eq.${userId},id.in.(${managed.join(",")})` : `owner_id.eq.${userId}`;

  const { data, error } = await supabase
    .from("businesses")
    .select(
      `id, slug, name, status, rejection_reason, city, is_verified, is_featured, pending_changes, pending_changes_submitted_at, created_at, logo_path,
       category:business_categories!businesses_category_id_fkey ( icon, name ),
       verification:business_verification_requests ( status, created_at )`,
    )
    .or(filter)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getViewsLast30Days(businessIds: string[]): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (!businessIds.length) return result;
  const supabase = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const { data } = await supabase
    .from("business_daily_views")
    .select("business_id, views")
    .in("business_id", businessIds)
    .gte("day", since);
  for (const row of data ?? []) result.set(row.business_id, (result.get(row.business_id) ?? 0) + row.views);
  return result;
}
