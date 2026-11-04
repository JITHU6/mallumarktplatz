import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { SlidersHorizontal } from "lucide-react";
import { NativeSelect } from "@/components/forms/native-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CategoryWithCount, CityWithCount } from "@/lib/data/taxonomy";
import type { DirectoryParams } from "@/lib/directory-params";
import { localizedName } from "@/lib/i18n-helpers";

/**
 * Filter sidebar. A plain GET form (works without JavaScript); the directory
 * page converts category/city query params into canonical path segments.
 */
export async function DirectoryFilters({
  params,
  categories,
  cities,
}: {
  params: DirectoryParams;
  categories: CategoryWithCount[];
  cities: CityWithCount[];
}) {
  const t = await getTranslations("directory");
  const locale = await getLocale();
  const topLevel = categories.filter((c) => !c.parent_id);
  const sortedCities = [...cities].sort((a, b) => a.name.localeCompare(b.name, "de"));

  const form = (
    <form action="/businesses" method="get" className="space-y-5" role="search">
      <input type="hidden" name="sort" value={params.sort === "relevance" ? "" : params.sort} />
      <input type="hidden" name="view" value={params.view === "grid" ? "" : params.view} />
      <div className="space-y-2">
        <Label htmlFor="f-q">{t("keyword")}</Label>
        <Input id="f-q" name="q" type="search" defaultValue={params.q} placeholder={t("keywordPlaceholder")} maxLength={100} className="bg-white" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="f-category">{t("category")}</Label>
        <NativeSelect id="f-category" name="category" defaultValue={params.category ?? ""}>
          <option value="">{t("allCategories")}</option>
          {topLevel.map((c) => {
            const children = categories.filter((s) => s.parent_id === c.id);
            return [
              <option key={c.id} value={c.slug}>
                {localizedName(c.name, c.name_translations, locale)}
              </option>,
              ...children.map((s) => (
                <option key={s.id} value={s.slug}>
                  {"  – "}
                  {localizedName(s.name, s.name_translations, locale)}
                </option>
              )),
            ];
          })}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="f-city">{t("city")}</Label>
        <NativeSelect id="f-city" name="city" defaultValue={params.city ?? ""}>
          <option value="">{t("allCities")}</option>
          {sortedCities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {localizedName(c.name, c.name_translations, locale)}
              {c.businessCount > 0 ? ` (${c.businessCount})` : ""}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="f-plz">{t("postalCode")}</Label>
        <Input
          id="f-plz"
          name="plz"
          inputMode="numeric"
          pattern="[0-9]{1,5}"
          maxLength={5}
          defaultValue={params.postalCode}
          placeholder={t("postalCodePlaceholder")}
          className="bg-white"
        />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="verified"
          value="1"
          defaultChecked={params.verified}
          className="size-4 rounded border-input accent-forest"
        />
        {t("verifiedOnly")}
      </label>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          {t("apply")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/businesses">{t("reset")}</Link>
        </Button>
      </div>
    </form>
  );

  const activeCount = [params.q, params.category, params.city, params.postalCode, params.verified].filter(Boolean).length;

  return (
    <aside aria-label={t("filters")}>
      {/* Mobile: collapsible */}
      <details className="group rounded-2xl border border-border bg-card shadow-sm lg:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold text-forest">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t("filters")}
          {activeCount > 0 && (
            <span className="ml-1 rounded-full bg-gold px-2 text-xs text-charcoal">{activeCount}</span>
          )}
        </summary>
        <div className="border-t border-border p-4">{form}</div>
      </details>
      {/* Desktop: sticky sidebar */}
      <div className="sticky top-24 hidden rounded-2xl border border-border bg-card p-5 shadow-sm lg:block">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-forest">
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {t("filters")}
        </h2>
        {form}
      </div>
    </aside>
  );
}
