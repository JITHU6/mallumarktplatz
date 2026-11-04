import type { Json } from "@/lib/supabase/database.types";

/** Returns the translated name stored in a `name_translations` JSON column. */
export function localizedName(name: string, translations: Json | null | undefined, locale: string): string {
  if (translations && typeof translations === "object" && !Array.isArray(translations)) {
    const value = (translations as Record<string, Json | undefined>)[locale];
    if (typeof value === "string" && value.trim()) return value;
  }
  return name;
}
