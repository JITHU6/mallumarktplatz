import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE, negotiateLocale } from "./config";
import en from "../../messages/en.json";

type Messages = Record<string, unknown>;

function deepMerge(base: Messages, override: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = out[key];
    out[key] =
      value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object"
        ? deepMerge(current as Messages, value as Messages)
        : value;
  }
  return out;
}

export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : negotiateLocale((await headers()).get("accept-language"));

  // English is the source of truth; other languages fall back to it for any missing key.
  const messages =
    locale === defaultLocale
      ? en
      : deepMerge(en, (await import(`../../messages/${locale}.json`)).default as Messages);

  return { locale, messages: messages as typeof en, timeZone: "Europe/Berlin" };
});
