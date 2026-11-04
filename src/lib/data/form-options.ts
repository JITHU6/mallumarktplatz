import "server-only";
import { getLocale } from "next-intl/server";
import type { CategoryOption } from "@/components/forms/business-form";
import { localizedName } from "@/lib/i18n-helpers";
import { getCategories, getCities } from "./taxonomy";

export async function getBusinessFormOptions() {
  const [categories, cities, locale] = await Promise.all([getCategories(), getCities(), getLocale()]);
  const categoryOptions: CategoryOption[] = categories.map((c) => ({
    id: c.id,
    name: localizedName(c.name, c.name_translations, locale),
    parentId: c.parent_id,
  }));
  // Suggest the German spelling first (addresses are usually written in German).
  const cityNames = Array.from(
    new Set(cities.map((c) => localizedName(c.name, c.name_translations, "de"))),
  ).sort((a, b) => a.localeCompare(b, "de"));
  return { categoryOptions, cityNames };
}
