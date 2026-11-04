import { getLocale, getTranslations } from "next-intl/server";
import { MapPin, Search, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CategoryWithCount } from "@/lib/data/taxonomy";
import { localizedName } from "@/lib/i18n-helpers";
import { NativeSelect } from "@/components/forms/native-select";

/** Plain GET form – works without JavaScript and lands on the directory. */
export async function HeroSearch({ categories }: { categories: CategoryWithCount[] }) {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const topLevel = categories.filter((c) => !c.parent_id);

  return (
    <form
      action="/businesses"
      method="get"
      role="search"
      className="grid gap-2 rounded-2xl bg-white p-2 shadow-xl shadow-black/10 md:grid-cols-[1.4fr_1fr_1fr_auto]"
    >
      <label className="flex items-center gap-2 rounded-xl px-3 focus-within:ring-2 focus-within:ring-ring md:border-r md:border-border md:rounded-none">
        <Search className="size-5 shrink-0 text-forest" aria-hidden="true" />
        <span className="sr-only">{t("searchKeyword")}</span>
        <input
          name="q"
          type="search"
          placeholder={t("searchKeywordPlaceholder")}
          className="h-12 w-full bg-transparent text-base text-charcoal outline-none placeholder:text-muted-foreground"
          maxLength={100}
        />
      </label>
      <label className="flex items-center gap-2 rounded-xl px-3 focus-within:ring-2 focus-within:ring-ring md:border-r md:border-border md:rounded-none">
        <Tag className="size-5 shrink-0 text-forest" aria-hidden="true" />
        <span className="sr-only">{t("searchCategory")}</span>
        <NativeSelect name="category" defaultValue="" className="h-12 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0">
          <option value="">{t("allCategories")}</option>
          {topLevel.map((c) => (
            <option key={c.id} value={c.slug}>
              {localizedName(c.name, c.name_translations, locale)}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="flex items-center gap-2 rounded-xl px-3 focus-within:ring-2 focus-within:ring-ring">
        <MapPin className="size-5 shrink-0 text-forest" aria-hidden="true" />
        <span className="sr-only">{t("searchLocation")}</span>
        <input
          name="location"
          type="text"
          placeholder={t("searchLocationPlaceholder")}
          className="h-12 w-full bg-transparent text-base text-charcoal outline-none placeholder:text-muted-foreground"
          maxLength={60}
          autoComplete="address-level2"
        />
      </label>
      <Button type="submit" size="lg" className="h-12 rounded-xl px-6 text-base">
        <Search /> {t("searchButton")}
      </Button>
    </form>
  );
}
