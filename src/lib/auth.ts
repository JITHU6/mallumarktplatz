import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { env } from "@/lib/env";
import { setSpanUser } from "@/lib/telemetry";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/database.types";

export type CurrentUser = {
  id: string;
  email: string | null;
  emailConfirmed: boolean;
  profile: Profile | null;
  isAdmin: boolean;
};

/** Current user from a verified JWT (getClaims validates the signature). Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!env.supabaseUrl || !env.supabasePublishableKey) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", claims.sub).maybeSingle();
  setSpanUser(claims.sub, profile?.role);

  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? profile?.email ?? null,
    emailConfirmed: Boolean((claims as Record<string, unknown>).email_verified ?? true),
    profile: profile ?? null,
    isAdmin: profile?.role === "admin",
  };
});

export async function requireUser(next = "/dashboard"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Server-side admin gate. Use in every admin page AND server action. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!user.isAdmin) notFound();
  return user;
}
