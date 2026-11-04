"use server";

import { logger } from "@/lib/logger";
import { traceAction } from "@/lib/telemetry";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { getCurrentUser } from "@/lib/auth";
import { MEDIA_BUCKET } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fieldErrors } from "@/lib/validation/business";

export type SimpleState = { status: "idle" | "success" | "error"; fieldErrors?: Record<string, string>; reference?: string };

const profileSchema = z.object({
  fullName: z.string().trim().min(2, { message: "required" }).max(120, { message: "tooLong" }),
  preferredLocale: z.string().refine(isLocale, { message: "invalid" }),
});

async function updateProfileImpl(_: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error" };
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    preferredLocale: formData.get("preferredLocale"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.data.fullName, preferred_locale: parsed.data.preferredLocale })
    .eq("id", user.id);
  if (error) {
    logger.error("profile update failed", { error });
    return { status: "error" };
  }

  (await cookies()).set(LOCALE_COOKIE, parsed.data.preferredLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { status: "success" };
}

/** Lists every object in the user's storage folder (recursively, one level of nesting). */
async function listUserFiles(admin: ReturnType<typeof createAdminClient>, userId: string): Promise<string[]> {
  const files: string[] = [];
  const queue = [userId];
  while (queue.length) {
    const prefix = queue.shift()!;
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await admin.storage.from(MEDIA_BUCKET).list(prefix, { limit: 100, offset });
      if (error || !data?.length) break;
      for (const item of data) {
        const path = `${prefix}/${item.name}`;
        if (item.id === null) queue.push(path);
        else files.push(path);
      }
      if (data.length < 100) break;
    }
  }
  return files;
}

/**
 * GDPR: permanently deletes the account. Profile, businesses (and their
 * images, hours, links, favourites, stats) are removed via ON DELETE CASCADE.
 */
async function deleteAccountImpl(_: SimpleState, formData: FormData): Promise<SimpleState> {
  const user = await getCurrentUser();
  if (!user) return { status: "error" };
  if (formData.get("confirm") !== "DELETE") return { status: "error", fieldErrors: { confirm: "invalid" } };

  try {
    const admin = createAdminClient();
    const files = await listUserFiles(admin, user.id);
    for (let i = 0; i < files.length; i += 100) {
      await admin.storage.from(MEDIA_BUCKET).remove(files.slice(i, i + 100));
    }
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  } catch (error) {
    logger.error("account deletion failed", { error });
    return { status: "error" };
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// --- Traced exports: one span + structured log line per call (see src/lib/telemetry.ts) ---
export async function updateProfile(...args: Parameters<typeof updateProfileImpl>): ReturnType<typeof updateProfileImpl> {
  return traceAction("account.updateProfile", updateProfileImpl, args);
}
export async function deleteAccount(...args: Parameters<typeof deleteAccountImpl>): ReturnType<typeof deleteAccountImpl> {
  return traceAction("account.deleteAccount", deleteAccountImpl, args);
}
