"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { Database } from "./database.types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser Supabase client (used for direct image uploads to Storage). */
export function createClient() {
  client ??= createBrowserClient<Database>(env.supabaseUrl, env.supabasePublishableKey);
  return client;
}
