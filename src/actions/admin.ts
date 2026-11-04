"use server";

import { traceAction } from "@/lib/telemetry";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { geocodeAddress } from "@/lib/geocode";
import { SLUG_PATTERN } from "@/lib/slug";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AdminResult = { status: "idle" | "success" | "error"; message?: string; nonce?: number; reference?: string };

const ok = (message?: string): AdminResult => ({ status: "success", message, nonce: Date.now() });
const fail = (message: string): AdminResult => ({ status: "error", message, nonce: Date.now() });

/** Every admin action re-checks the role server-side (RLS enforces it again in the DB). */
async function adminContext() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) throw new Error("Forbidden");
  return { user, supabase: await createClient() };
}

function revalidateBusinessPaths(slug?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/business/${slug}`);
}

/** Server-side validation of pending changes before they are applied. */
const pendingChangesSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    category_id: z.uuid(),
    subcategory_id: z.uuid().nullable(),
    short_description: z.string().trim().min(10).max(200),
    description: z.string().max(5000).nullable(),
    owner_display_name: z.string().max(120).nullable(),
    address_line: z.string().max(200).nullable(),
    postal_code: z.string().regex(/^\d{5}$/),
    city: z.string().trim().min(2).max(100),
    bundesland: z.string().max(60).nullable(),
    logo_path: z.string().max(300).nullable(),
    cover_image_path: z.string().max(300).nullable(),
  })
  .partial()
  .strict();

const moderationSchema = z.object({
  businessId: z.uuid(),
  intent: z.enum([
    "approve",
    "reject",
    "suspend",
    "reinstate",
    "feature",
    "unfeature",
    "verify",
    "unverify",
    "applyChanges",
    "discardChanges",
    "geocode",
  ]),
  reason: z.string().trim().max(1000).optional(),
});

async function moderateBusinessImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const parsed = moderationSchema.safeParse({
    businessId: formData.get("businessId"),
    intent: formData.get("intent"),
    reason: formData.get("reason") ?? undefined,
  });
  if (!parsed.success) return fail("Invalid request");
  const { businessId, intent, reason } = parsed.data;

  const { data: business, error: loadError } = await supabase
    .from("businesses")
    .select("id, slug, status, pending_changes, address_line, postal_code, city, latitude")
    .eq("id", businessId)
    .single();
  if (loadError || !business) return fail("Business not found");

  let update: TablesUpdate<"businesses"> = {};
  switch (intent) {
    case "approve":
    case "reinstate":
      update = { status: "approved", rejection_reason: null };
      if (business.latitude == null) {
        const coords = await geocodeAddress({
          addressLine: business.address_line,
          postalCode: business.postal_code,
          city: business.city,
        });
        if (coords) update = { ...update, latitude: coords.latitude, longitude: coords.longitude };
      }
      break;
    case "reject":
      if (!reason) return fail("Please provide a reason");
      update = { status: "rejected", rejection_reason: reason, is_featured: false };
      break;
    case "suspend":
      update = { status: "suspended", is_featured: false };
      break;
    case "feature":
      if (business.status !== "approved") return fail("Only approved listings can be featured");
      update = { is_featured: true };
      break;
    case "unfeature":
      update = { is_featured: false };
      break;
    case "verify":
      update = { is_verified: true };
      break;
    case "unverify":
      update = { is_verified: false };
      break;
    case "discardChanges":
      update = { pending_changes: null, pending_changes_submitted_at: null };
      break;
    case "applyChanges": {
      const changes = pendingChangesSchema.safeParse(business.pending_changes ?? {});
      if (!changes.success) return fail("Pending changes are invalid and cannot be applied");
      update = { ...changes.data, pending_changes: null, pending_changes_submitted_at: null };
      const addressChanged = ["address_line", "postal_code", "city"].some((k) => k in changes.data);
      if (addressChanged) {
        const coords = await geocodeAddress({
          addressLine: changes.data.address_line ?? business.address_line,
          postalCode: changes.data.postal_code ?? business.postal_code,
          city: changes.data.city ?? business.city,
        });
        update = { ...update, latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null };
      }
      break;
    }
    case "geocode": {
      const coords = await geocodeAddress({
        addressLine: business.address_line,
        postalCode: business.postal_code,
        city: business.city,
      });
      if (!coords) return fail("No coordinates found");
      update = { latitude: coords.latitude, longitude: coords.longitude };
      break;
    }
  }

  const { data: saved, error } = await supabase.from("businesses").update(update).eq("id", businessId).select("slug").single();
  if (error) return fail(error.message);

  if (intent === "verify") {
    await supabase
      .from("business_verification_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("business_id", businessId)
      .eq("status", "pending");
  }
  revalidateBusinessPaths(saved?.slug ?? business.slug);
  if (business.slug !== saved?.slug) revalidatePath(`/business/${business.slug}`);
  return ok();
}

async function deleteBusinessAsAdminImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const id = z.uuid().safeParse(formData.get("businessId"));
  if (!id.success) return fail("Invalid request");
  const { error } = await supabase.from("businesses").delete().eq("id", id.data);
  if (error) return fail(error.message);
  revalidateBusinessPaths();
  redirect("/admin/businesses");
}

async function setUserRoleImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user, supabase } = await adminContext();
  const parsed = z
    .object({ userId: z.uuid(), role: z.enum(["user", "business_owner", "admin"]) })
    .safeParse({ userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) return fail("Invalid request");
  if (parsed.data.userId === user.id) return fail("You cannot change your own role");
  const { error } = await supabase.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.userId);
  if (error) return fail(error.message);
  revalidatePath("/admin/users");
  return ok();
}

async function slugTaken(supabase: Awaited<ReturnType<typeof createClient>>, slug: string, ownTable: "categories" | "cities", ownId?: string) {
  const [{ data: cats }, { data: cities }] = await Promise.all([
    supabase.from("business_categories").select("id").eq("slug", slug),
    supabase.from("cities").select("id").eq("slug", slug),
  ]);
  const catConflict = (cats ?? []).some((c) => !(ownTable === "categories" && c.id === ownId));
  const cityConflict = (cities ?? []).some((c) => !(ownTable === "cities" && c.id === ownId));
  return catConflict || cityConflict;
}

const translations = (de: unknown, ml: unknown) => {
  const out: Record<string, string> = {};
  if (typeof de === "string" && de.trim()) out.de = de.trim();
  if (typeof ml === "string" && ml.trim()) out.ml = ml.trim();
  return out;
};

const categorySchema = z.object({
  id: z.uuid().optional(),
  slug: z.string().trim().regex(SLUG_PATTERN).max(60),
  name: z.string().trim().min(2).max(80),
  icon: z.string().trim().max(40).default("briefcase"),
  parentId: z.uuid().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(100),
  isActive: z.boolean(),
});

async function saveCategoryImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const parsed = categorySchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
    parentId: formData.get("parentId") || null,
    sortOrder: formData.get("sortOrder") || undefined,
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return fail("Please check the fields (slug: lowercase letters, numbers and dashes)");
  const d = parsed.data;
  if (d.parentId && d.parentId === d.id) return fail("A category cannot be its own parent");
  if (await slugTaken(supabase, d.slug, "categories", d.id)) return fail("This slug is already used by a category or city");

  const row = {
    slug: d.slug,
    name: d.name,
    icon: d.icon,
    parent_id: d.parentId,
    sort_order: d.sortOrder,
    is_active: d.isActive,
    name_translations: translations(formData.get("nameDe"), formData.get("nameMl")),
  };
  const { error } = d.id
    ? await supabase.from("business_categories").update(row).eq("id", d.id)
    : await supabase.from("business_categories").insert(row);
  if (error) return fail(error.message);
  revalidateBusinessPaths();
  return ok();
}

async function deleteCategoryImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Invalid request");
  const { error } = await supabase.from("business_categories").delete().eq("id", id.data);
  if (error) {
    return fail(error.code === "23503" ? "This category is used by businesses. Deactivate it instead." : error.message);
  }
  revalidateBusinessPaths();
  return ok();
}

const optionalNumber = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
  z.number().finite().nullable(),
);

const citySchema = z.object({
  id: z.uuid().optional(),
  slug: z.string().trim().regex(SLUG_PATTERN).max(60),
  name: z.string().trim().min(2).max(80),
  state: z.string().trim().max(60).optional(),
  aliases: z.string().max(500).optional(),
  latitude: optionalNumber.refine((v) => v === null || (v >= -90 && v <= 90)),
  longitude: optionalNumber.refine((v) => v === null || (v >= -180 && v <= 180)),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(100),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});

async function saveCityImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const parsed = citySchema.safeParse({
    id: formData.get("id") || undefined,
    slug: formData.get("slug"),
    name: formData.get("name"),
    state: formData.get("state") || undefined,
    aliases: formData.get("aliases") || undefined,
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
    sortOrder: formData.get("sortOrder") || undefined,
    isFeatured: formData.get("isFeatured") === "on",
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) return fail("Please check the fields (slug: lowercase letters, numbers and dashes)");
  const d = parsed.data;
  if (await slugTaken(supabase, d.slug, "cities", d.id)) return fail("This slug is already used by a category or city");

  const row = {
    slug: d.slug,
    name: d.name,
    state: d.state ?? null,
    aliases: (d.aliases ?? "")
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean),
    latitude: d.latitude,
    longitude: d.longitude,
    sort_order: d.sortOrder,
    is_featured: d.isFeatured,
    is_active: d.isActive,
    name_translations: translations(formData.get("nameDe"), formData.get("nameMl")),
  };
  const { error } = d.id ? await supabase.from("cities").update(row).eq("id", d.id) : await supabase.from("cities").insert(row);
  if (error) return fail(error.message);
  revalidateBusinessPaths();
  return ok();
}

async function deleteCityImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return fail("Invalid request");
  const { error } = await supabase.from("cities").delete().eq("id", id.data);
  if (error) return fail(error.message);
  revalidateBusinessPaths();
  return ok();
}

async function updateReportImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const parsed = z
    .object({ reportId: z.uuid(), status: z.enum(["open", "resolved", "dismissed"]), adminNotes: z.string().max(2000).optional() })
    .safeParse({
      reportId: formData.get("reportId"),
      status: formData.get("status"),
      adminNotes: formData.get("adminNotes") ?? undefined,
    });
  if (!parsed.success) return fail("Invalid request");
  const { error } = await supabase
    .from("business_reports")
    .update({
      status: parsed.data.status,
      admin_notes: parsed.data.adminNotes || null,
      resolved_at: parsed.data.status === "open" ? null : new Date().toISOString(),
    })
    .eq("id", parsed.data.reportId);
  if (error) return fail(error.message);
  revalidatePath("/admin", "layout");
  return ok();
}

async function reviewVerificationImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { user, supabase } = await adminContext();
  const parsed = z
    .object({ requestId: z.uuid(), decision: z.enum(["approved", "rejected"]), adminNotes: z.string().max(2000).optional() })
    .safeParse({
      requestId: formData.get("requestId"),
      decision: formData.get("decision"),
      adminNotes: formData.get("adminNotes") ?? undefined,
    });
  if (!parsed.success) return fail("Invalid request");

  const { data: request, error } = await supabase
    .from("business_verification_requests")
    .update({
      status: parsed.data.decision,
      admin_notes: parsed.data.adminNotes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.requestId)
    .select("business_id")
    .single();
  if (error || !request) return fail(error?.message ?? "Not found");

  if (parsed.data.decision === "approved") {
    const { error: verifyError } = await supabase.from("businesses").update({ is_verified: true }).eq("id", request.business_id);
    if (verifyError) return fail(verifyError.message);
  }
  revalidateBusinessPaths();
  return ok();
}

async function addManagerImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const parsed = z
    .object({ businessId: z.uuid(), email: z.email() })
    .safeParse({ businessId: formData.get("businessId"), email: formData.get("email") });
  if (!parsed.success) return fail("Invalid email");
  const { data: profile } = await supabase.from("profiles").select("id").eq("email", parsed.data.email.toLowerCase()).maybeSingle();
  if (!profile) return fail("No user with this email");
  const { error } = await supabase.from("business_managers").insert({ business_id: parsed.data.businessId, user_id: profile.id });
  if (error && error.code !== "23505") return fail(error.message);
  revalidatePath("/admin", "layout");
  return ok();
}

async function removeManagerImpl(_: AdminResult, formData: FormData): Promise<AdminResult> {
  const { supabase } = await adminContext();
  const parsed = z
    .object({ businessId: z.uuid(), userId: z.uuid() })
    .safeParse({ businessId: formData.get("businessId"), userId: formData.get("userId") });
  if (!parsed.success) return fail("Invalid request");
  const { error } = await supabase
    .from("business_managers")
    .delete()
    .eq("business_id", parsed.data.businessId)
    .eq("user_id", parsed.data.userId);
  if (error) return fail(error.message);
  revalidatePath("/admin", "layout");
  return ok();
}

// --- Traced exports: one span + structured log line per call (see src/lib/telemetry.ts) ---
export async function moderateBusiness(...args: Parameters<typeof moderateBusinessImpl>): ReturnType<typeof moderateBusinessImpl> {
  return traceAction("admin.moderateBusiness", moderateBusinessImpl, args);
}
export async function deleteBusinessAsAdmin(...args: Parameters<typeof deleteBusinessAsAdminImpl>): ReturnType<typeof deleteBusinessAsAdminImpl> {
  return traceAction("admin.deleteBusinessAsAdmin", deleteBusinessAsAdminImpl, args);
}
export async function setUserRole(...args: Parameters<typeof setUserRoleImpl>): ReturnType<typeof setUserRoleImpl> {
  return traceAction("admin.setUserRole", setUserRoleImpl, args);
}
export async function saveCategory(...args: Parameters<typeof saveCategoryImpl>): ReturnType<typeof saveCategoryImpl> {
  return traceAction("admin.saveCategory", saveCategoryImpl, args);
}
export async function deleteCategory(...args: Parameters<typeof deleteCategoryImpl>): ReturnType<typeof deleteCategoryImpl> {
  return traceAction("admin.deleteCategory", deleteCategoryImpl, args);
}
export async function saveCity(...args: Parameters<typeof saveCityImpl>): ReturnType<typeof saveCityImpl> {
  return traceAction("admin.saveCity", saveCityImpl, args);
}
export async function deleteCity(...args: Parameters<typeof deleteCityImpl>): ReturnType<typeof deleteCityImpl> {
  return traceAction("admin.deleteCity", deleteCityImpl, args);
}
export async function updateReport(...args: Parameters<typeof updateReportImpl>): ReturnType<typeof updateReportImpl> {
  return traceAction("admin.updateReport", updateReportImpl, args);
}
export async function reviewVerification(...args: Parameters<typeof reviewVerificationImpl>): ReturnType<typeof reviewVerificationImpl> {
  return traceAction("admin.reviewVerification", reviewVerificationImpl, args);
}
export async function addManager(...args: Parameters<typeof addManagerImpl>): ReturnType<typeof addManagerImpl> {
  return traceAction("admin.addManager", addManagerImpl, args);
}
export async function removeManager(...args: Parameters<typeof removeManagerImpl>): ReturnType<typeof removeManagerImpl> {
  return traceAction("admin.removeManager", removeManagerImpl, args);
}
