"use server";

import { logger } from "@/lib/logger";
import { traceAction } from "@/lib/telemetry";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  emailSchema,
  loginSchema,
  newPasswordSchema,
  registerSchema,
  safeNextPath,
} from "@/lib/validation/auth";
import { fieldErrors } from "@/lib/validation/business";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  error?: string; // translation key in auth.errors
  fieldErrors?: Record<string, string>;
  email?: string;
  /** Trace reference for support, set on failures by traceAction */
  reference?: string;
};

function mapAuthError(error: { code?: string; message?: string; status?: number }): string {
  const level = error.code === "invalid_credentials" || error.code === "email_not_confirmed" ? "info" : "warn";
  logger[level]("auth error", { auth_code: error.code, status: error.status, auth_message: error.message });
  switch (error.code) {
    case "invalid_credentials":
      return "invalidCredentials";
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "rateLimited";
    case "user_already_exists":
    case "email_exists":
      return "userExists";
    case "weak_password":
      return "weakPassword";
    case "same_password":
      return "weakPassword";
    default:
      return error.status === 429 ? "rateLimited" : "generic";
  }
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : env.siteUrl;
}

async function loginImpl(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", error: mapAuthError(error), email: parsed.data.email };

  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("next")));
}

async function registerImpl(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    acceptTerms: formData.get("acceptTerms"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { status: "error", error: mapAuthError(error) };

  // With email confirmation enabled Supabase returns no session.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect(next);
  }
  return { status: "success", email: parsed.data.email };
}

async function requestPasswordResetImpl(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  // Do not reveal whether the account exists; only surface rate limiting.
  if (error && mapAuthError(error) === "rateLimited") return { status: "error", error: "rateLimited" };
  return { status: "success" };
}

async function updatePasswordImpl(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = newPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { status: "error", error: "sessionExpired" };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", error: mapAuthError(error) };
  return { status: "success" };
}

async function logoutImpl() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// --- Traced exports: one span + structured log line per call (see src/lib/telemetry.ts) ---
export async function login(...args: Parameters<typeof loginImpl>): ReturnType<typeof loginImpl> {
  return traceAction("auth.login", loginImpl, args);
}
export async function register(...args: Parameters<typeof registerImpl>): ReturnType<typeof registerImpl> {
  return traceAction("auth.register", registerImpl, args);
}
export async function requestPasswordReset(...args: Parameters<typeof requestPasswordResetImpl>): ReturnType<typeof requestPasswordResetImpl> {
  return traceAction("auth.requestPasswordReset", requestPasswordResetImpl, args);
}
export async function updatePassword(...args: Parameters<typeof updatePasswordImpl>): ReturnType<typeof updatePasswordImpl> {
  return traceAction("auth.updatePassword", updatePasswordImpl, args);
}
export async function logout(...args: Parameters<typeof logoutImpl>): ReturnType<typeof logoutImpl> {
  return traceAction("auth.logout", logoutImpl, args);
}
