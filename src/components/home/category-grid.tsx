import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CategoryIcon } from "@/components/business/category-icon";
import type { CategoryWithCount } from "@/lib/data/taxonomy";
import { localizedName } from "@/lib/i18n-helpers";

export async function CategoryGrid({ categories }: { categories: CategoryWithCount[] }) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {categories.map((c) => (
        <li key={c.id}>
          <Link
            href={`/categories/${c.slug}`}
            className="group flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-forest transition-colors group-hover:bg-forest group-hover:text-gold">
              <CategoryIcon icon={c.icon} className="size-5" />
            </span>
            <span className="text-sm leading-snug font-semibold text-charcoal">
              {localizedName(c.name, c.name_translations, locale)}
            </span>
            <span className="mt-auto text-xs text-muted-foreground">{t("businessesCount", { count: c.businessCount })}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
