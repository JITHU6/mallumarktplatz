import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

/**
 * Privileged client using the Supabase secret (service-role) key.
 * ONLY used for operations that cannot be expressed with RLS, such as deleting
 * an auth user (GDPR account deletion). Never import this from client code.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!env.supabaseUrl || !secret) {
    throw new Error("SUPABASE_SECRET_KEY is not configured.");
  }
  return createClient<Database>(env.supabaseUrl, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
