import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { MapPin } from "lucide-react";
import type { CityWithCount } from "@/lib/data/taxonomy";
import { localizedName } from "@/lib/i18n-helpers";

export async function CityGrid({ cities }: { cities: CityWithCount[] }) {
  const locale = await getLocale();
  const t = await getTranslations("common");
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cities.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/businesses/${c.slug}`}
            className="group relative flex h-28 flex-col justify-end overflow-hidden rounded-2xl bg-forest p-4 text-cream shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-gold focus-visible:outline-none"
          >
            <div className="hero-pattern absolute inset-0 opacity-80 transition-opacity group-hover:opacity-100" aria-hidden="true" />
            <MapPin className="absolute top-4 right-4 size-5 text-gold" aria-hidden="true" />
            <span className="relative text-lg font-bold">{localizedName(c.name, c.name_translations, locale)}</span>
            <span className="relative text-xs text-cream/75">{t("businessesCount", { count: c.businessCount })}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
