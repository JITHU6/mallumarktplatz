"use server";

import { traceAction } from "@/lib/telemetry";
import { cookies } from "next/headers";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";

async function setLocaleImpl(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

// --- Traced exports: one span + structured log line per call (see src/lib/telemetry.ts) ---
export async function setLocale(...args: Parameters<typeof setLocaleImpl>): ReturnType<typeof setLocaleImpl> {
  return traceAction("locale.setLocale", setLocaleImpl, args);
}
