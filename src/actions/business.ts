"use server";

import { logger } from "@/lib/logger";
import { traceAction } from "@/lib/telemetry";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { REVIEWED_COLUMNS, type ReviewedColumn } from "@/lib/business-columns";
import { geocodeAddress } from "@/lib/geocode";
import { isOwnStoragePath, MEDIA_BUCKET } from "@/lib/storage";
import type { Json, TablesUpdate } from "@/lib/supabase/database.types";
import { createClient, type ServerSupabaseClient } from "@/lib/supabase/server";
import {
  businessFormDataToObject,
  businessSchema,
  createBusinessSchema,
  fieldErrors,
  normalizeHours,
  SOCIAL_PLATFORMS,
  type BusinessInput,
} from "@/lib/validation/business";

export type BusinessFormValues = ReturnType<typeof businessFormDataToObject>;

export type BusinessFormState = {
  status: "idle" | "error" | "success";
  /** Translation key in the "form" namespace */
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: BusinessFormValues;
  submissionId?: number;
  reference?: string;
};


function toColumns(input: BusinessInput) {
  return {
    reviewed: {
      name: input.name,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      short_description: input.shortDescription,
      description: input.description,
      owner_display_name: input.showOwnerName ? input.ownerName : null,
      address_line: input.addressLine,
      postal_code: input.postalCode,
      city: input.city,
      bundesland: input.bundesland,
      logo_path: input.logoPath,
      cover_image_path: input.coverPath,
    } satisfies Record<ReviewedColumn, unknown>,
    direct: {
      services: input.services,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      website: input.website,
      hide_street_address: input.hideStreetAddress,
    },
  };
}

function errorState(message: string, values: BusinessFormValues, extra: Partial<BusinessFormState> = {}): BusinessFormState {
  return { status: "error", message, values, submissionId: Date.now(), ...extra };
}

function mapDbError(error: { code?: string; message?: string }): string {
  if (error.code === "23505") return "errorDuplicate";
  if (error.message?.includes("TOO_MANY_PENDING_SUBMISSIONS")) return "errorTooManyPending";
  return "errorGeneric";
}

/** Subcategory must belong to the chosen category. */
async function validateTaxonomy(
  supabase: ServerSupabaseClient,
  input: BusinessInput,
): Promise<Record<string, string> | null> {
  const ids = [input.categoryId, input.subcategoryId].filter(Boolean) as string[];
  const { data } = await supabase.from("business_categories").select("id, parent_id, is_active").in("id", ids);
  const category = data?.find((c) => c.id === input.categoryId);
  if (!category || !category.is_active) return { categoryId: "required" };
  if (input.subcategoryId) {
    const sub = data?.find((c) => c.id === input.subcategoryId);
    if (!sub || sub.parent_id !== input.categoryId) return { subcategoryId: "invalid" };
  }
  return null;
}

async function syncChildren(supabase: ServerSupabaseClient, businessId: string, input: BusinessInput) {
  const hours = normalizeHours(input.hours);
  const social = SOCIAL_PLATFORMS.flatMap((platform) => {
    const url = input.social[platform];
    return url ? [{ business_id: businessId, platform, url }] : [];
  });

  const results = await Promise.all([
    supabase.from("business_opening_hours").delete().eq("business_id", businessId),
    supabase.from("business_social_links").delete().eq("business_id", businessId),
  ]);
  const deleteError = results.find((r) => r.error)?.error;
  if (deleteError) throw deleteError;

  if (hours.length) {
    const { error } = await supabase.from("business_opening_hours").insert(
      hours.map((h) => ({
        business_id: businessId,
        day_of_week: h.day,
        is_closed: h.closed,
        opens_at: h.opens,
        closes_at: h.closes,
      })),
    );
    if (error) throw error;
  }
  if (social.length) {
    const { error } = await supabase.from("business_social_links").insert(social);
    if (error) throw error;
  }

  // Gallery: keep order of submitted paths, delete removed ones.
  const { data: existing } = await supabase.from("business_images").select("id, storage_path").eq("business_id", businessId);
  const keep = new Set(input.galleryPaths);
  const removed = (existing ?? []).filter((img) => !keep.has(img.storage_path));
  if (removed.length) {
    await supabase.from("business_images").delete().in("id", removed.map((r) => r.id));
  }
  const existingPaths = new Map((existing ?? []).map((img) => [img.storage_path, img.id]));
  for (const [index, path] of input.galleryPaths.entries()) {
    const id = existingPaths.get(path);
    const { error } = id
      ? await supabase.from("business_images").update({ sort_order: index }).eq("id", id)
      : await supabase.from("business_images").insert({ business_id: businessId, storage_path: path, sort_order: index });
    if (error) throw error;
  }
  return removed.map((r) => r.storage_path);
}

async function saveBusinessImpl(_: BusinessFormState, formData: FormData): Promise<BusinessFormState> {
  const values = businessFormDataToObject(formData);
  const user = await getCurrentUser();
  if (!user) return errorState("errorGeneric", values);

  const businessId = formData.get("businessId");
  const isCreate = !businessId;
  if (!isCreate && !z.uuid().safeParse(businessId).success) return errorState("errorGeneric", values);

  const parsed = (isCreate ? createBusinessSchema : businessSchema).safeParse(values);
  if (!parsed.success) {
    return errorState("errorValidation", values, { fieldErrors: fieldErrors(parsed.error) });
  }
  const input = parsed.data;
  const supabase = await createClient();

  const taxonomyErrors = await validateTaxonomy(supabase, input);
  if (taxonomyErrors) return errorState("errorValidation", values, { fieldErrors: taxonomyErrors });

  const { reviewed, direct } = toColumns(input);

  // ---------------------------------------------------------------- create
  if (isCreate) {
    const paths = [input.logoPath, input.coverPath, ...input.galleryPaths].filter(Boolean) as string[];
    if (!user.isAdmin && paths.some((p) => !isOwnStoragePath(p, user.id))) {
      return errorState("errorValidation", values, { fieldErrors: { logoPath: "invalidImage" } });
    }
    const coords = await geocodeAddress({ addressLine: input.addressLine, postalCode: input.postalCode, city: input.city });

    const { data: created, error } = await supabase
      .from("businesses")
      .insert({
        ...reviewed,
        ...direct,
        owner_id: user.id,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      })
      .select("id, slug")
      .single();
    if (error || !created) {
      logger.error("business insert failed", { error });
      return errorState(mapDbError(error ?? {}), values);
    }

    try {
      const { error: detailsError } = await supabase.from("business_owner_details").insert({
        business_id: created.id,
        owner_name: input.ownerName,
        contact_email: user.email,
      });
      if (detailsError) throw detailsError;
      await syncChildren(supabase, created.id, input);
    } catch (childError) {
      logger.error("business child rows failed (rolled back)", { error: childError, business_id: created.id });
      await supabase.from("businesses").delete().eq("id", created.id);
      return errorState("errorGeneric", values);
    }

    revalidatePath("/dashboard", "layout");
    revalidatePath("/admin", "layout");
    redirect(`/dashboard/businesses?submitted=${created.id}`);
  }

  // ---------------------------------------------------------------- update
  const id = businessId as string;
  const { data: current, error: loadError } = await supabase
    .from("businesses")
    .select("id, slug, status, pending_changes, logo_path, cover_image_path, address_line, postal_code, city")
    .eq("id", id)
    .maybeSingle();
  if (loadError || !current) return errorState("errorGeneric", values);

  const { data: existingImages } = await supabase.from("business_images").select("storage_path").eq("business_id", id);
  const knownPaths = new Set(
    [current.logo_path, current.cover_image_path, ...(existingImages ?? []).map((i) => i.storage_path)].filter(Boolean),
  );
  const newPaths = [input.logoPath, input.coverPath, ...input.galleryPaths].filter(
    (p): p is string => Boolean(p) && !knownPaths.has(p),
  );
  if (!user.isAdmin && newPaths.some((p) => !isOwnStoragePath(p, user.id))) {
    return errorState("errorValidation", values, { fieldErrors: { logoPath: "invalidImage" } });
  }

  const published = current.status === "approved" || current.status === "suspended";
  let update: TablesUpdate<"businesses"> = { ...direct };
  let reviewRequired = false;

  if (published && !user.isAdmin) {
    // Compare against the live row; changed reviewed columns go to pending_changes.
    const { data: live } = await supabase.from("businesses").select(REVIEWED_COLUMNS.join(", ")).eq("id", id).single();
    const liveRow = (live ?? {}) as unknown as Record<ReviewedColumn, unknown>;
    const changes: Record<string, Json> = {};
    for (const col of REVIEWED_COLUMNS) {
      if ((liveRow[col] ?? null) !== (reviewed[col] ?? null)) changes[col] = (reviewed[col] ?? null) as Json;
    }
    update.pending_changes = Object.keys(changes).length ? changes : null;
    reviewRequired = Object.keys(changes).length > 0;
  } else {
    update = { ...update, ...reviewed };
    if (current.status === "rejected" && !user.isAdmin) update.status = "pending";
    const addressChanged =
      current.address_line !== reviewed.address_line ||
      current.postal_code !== reviewed.postal_code ||
      current.city !== reviewed.city;
    if (addressChanged) {
      const coords = await geocodeAddress({ addressLine: input.addressLine, postalCode: input.postalCode, city: input.city });
      update.latitude = coords?.latitude ?? null;
      update.longitude = coords?.longitude ?? null;
    }
  }

  const { data: saved, error: updateError } = await supabase
    .from("businesses")
    .update(update)
    .eq("id", id)
    .select("slug")
    .single();
  if (updateError || !saved) {
    if (updateError?.code !== "23505") logger.error("business update failed", { error: updateError, business_id: id });
    return errorState(mapDbError(updateError ?? {}), values);
  }

  try {
    await supabase
      .from("business_owner_details")
      .upsert({ business_id: id, owner_name: input.ownerName }, { onConflict: "business_id" });
    const removedGallery = await syncChildren(supabase, id, input);
    // Remove deleted gallery files the user owns (best effort).
    const ownRemoved = removedGallery.filter((p) => user.isAdmin || isOwnStoragePath(p, user.id));
    if (ownRemoved.length) await supabase.storage.from(MEDIA_BUCKET).remove(ownRemoved);
  } catch (childError) {
    logger.error("business child rows failed", { error: childError, business_id: id });
    return errorState("errorGeneric", values);
  }

  revalidatePath(`/business/${saved.slug}`);
  revalidatePath("/dashboard", "layout");
  revalidatePath("/admin", "layout");
  return {
    status: "success",
    message: reviewRequired ? "updateSuccessReview" : "updateSuccess",
    values,
    submissionId: Date.now(),
  };
}

async function deleteOwnBusinessImpl(businessId: string): Promise<{ ok: boolean }> {
  if (!z.uuid().safeParse(businessId).success) return { ok: false };
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, owner_id, logo_path, cover_image_path, images:business_images(storage_path)")
    .eq("id", businessId)
    .maybeSingle();
  if (!business || (business.owner_id !== user.id && !user.isAdmin)) return { ok: false };

  const { error } = await supabase.from("businesses").delete().eq("id", businessId);
  if (error) {
    logger.error("business delete failed", { error, business_id: businessId });
    return { ok: false };
  }

  const files = [business.logo_path, business.cover_image_path, ...(business.images ?? []).map((i) => i.storage_path)]
    .filter((p): p is string => Boolean(p))
    .filter((p) => user.isAdmin || isOwnStoragePath(p, user.id));
  if (files.length) await supabase.storage.from(MEDIA_BUCKET).remove(files);

  revalidatePath("/dashboard", "layout");
  revalidatePath("/businesses", "layout");
  return { ok: true };
}

const verificationSchema = z.object({ businessId: z.uuid(), message: z.string().trim().max(2000).optional() });

async function requestVerificationImpl(
  _: { status: "idle" | "success" | "error" },
  formData: FormData,
): Promise<{ status: "idle" | "success" | "error" }> {
  const parsed = verificationSchema.safeParse({
    businessId: formData.get("businessId"),
    message: formData.get("message") ?? undefined,
  });
  if (!parsed.success) return { status: "error" };
  const user = await getCurrentUser();
  if (!user) return { status: "error" };
  const supabase = await createClient();
  const { error } = await supabase.from("business_verification_requests").insert({
    business_id: parsed.data.businessId,
    message: parsed.data.message || null,
    requested_by: user.id,
  });
  if (error) {
    logger.warn("verification request failed", { error, business_id: parsed.data.businessId });
    return { status: "error" };
  }
  revalidatePath("/dashboard/businesses");
  revalidatePath("/admin", "layout");
  return { status: "success" };
}

// --- Traced exports: one span + structured log line per call (see src/lib/telemetry.ts) ---
export async function saveBusiness(...args: Parameters<typeof saveBusinessImpl>): ReturnType<typeof saveBusinessImpl> {
  return traceAction("business.saveBusiness", saveBusinessImpl, args);
}
export async function deleteOwnBusiness(...args: Parameters<typeof deleteOwnBusinessImpl>): ReturnType<typeof deleteOwnBusinessImpl> {
  return traceAction("business.deleteOwnBusiness", deleteOwnBusinessImpl, args);
}
export async function requestVerification(...args: Parameters<typeof requestVerificationImpl>): ReturnType<typeof requestVerificationImpl> {
  return traceAction("business.requestVerification", requestVerificationImpl, args);
}
