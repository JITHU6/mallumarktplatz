"use server";

import { logger } from "@/lib/logger";
import { traceAction } from "@/lib/telemetry";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const uuid = z.uuid();

/** Privacy-friendly view counter: increments a daily aggregate, stores no personal data. */
async function recordViewImpl(businessId: string) {
  if (!uuid.safeParse(businessId).success) return;
  const supabase = await createClient();
  await supabase.rpc("record_business_view", { p_business_id: businessId });
}

async function toggleFavouriteImpl(businessId: string): Promise<{ ok: boolean; saved?: boolean; error?: string }> {
  if (!uuid.safeParse(businessId).success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { ok: false, error: "unauthenticated" };

  const { data: existing } = await supabase
    .from("favourites")
    .select("business_id")
    .eq("user_id", userId)
    .eq("business_id", businessId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("favourites").delete().eq("user_id", userId).eq("business_id", businessId)
    : await supabase.from("favourites").insert({ user_id: userId, business_id: businessId });
  if (error) {
    logger.warn("favourite toggle failed", { error, business_id: businessId });
    return { ok: false, error: "failed" };
  }

  revalidatePath("/dashboard/favourites");
  return { ok: true, saved: !existing };
}

const reportSchema = z.object({
  businessId: z.uuid(),
  reason: z.enum([
    "incorrect_information",
    "closed_permanently",
    "not_malayali_owned",
    "inappropriate_content",
    "spam",
    "privacy",
    "removal_request",
    "other",
  ]),
  details: z.string().trim().max(2000).optional().default(""),
  email: z.union([z.literal(""), z.email()]).optional().default(""),
  // Honeypot field: must stay empty.
  website: z.string().max(0).optional(),
});

export type ReportState = { status: "idle" | "success" | "error"; reference?: string };

async function submitReportImpl(_: ReportState, formData: FormData): Promise<ReportState> {
  const parsed = reportSchema.safeParse({
    businessId: formData.get("businessId"),
    reason: formData.get("reason"),
    details: formData.get("details") ?? "",
    email: formData.get("email") ?? "",
    website: formData.get("website") ?? "",
  });
  if (!parsed.success) return { status: "error" };

  const supabase = await createClient();
  const { error } = await supabase.from("business_reports").insert({
    business_id: parsed.data.businessId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
    reporter_email: parsed.data.email || null,
  });
  if (error) logger.warn("report insert failed", { error, business_id: parsed.data.businessId });
  return { status: error ? "error" : "success" };
}

// --- Traced exports: one span + structured log line per call (see src/lib/telemetry.ts) ---
export async function recordView(...args: Parameters<typeof recordViewImpl>): ReturnType<typeof recordViewImpl> {
  return traceAction("public.recordView", recordViewImpl, args);
}
export async function toggleFavourite(...args: Parameters<typeof toggleFavouriteImpl>): ReturnType<typeof toggleFavouriteImpl> {
  return traceAction("public.toggleFavourite", toggleFavouriteImpl, args);
}
export async function submitReport(...args: Parameters<typeof submitReportImpl>): ReturnType<typeof submitReportImpl> {
  return traceAction("public.submitReport", submitReportImpl, args);
}
