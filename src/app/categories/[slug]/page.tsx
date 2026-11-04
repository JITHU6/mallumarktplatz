import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, MapPin, Store } from "lucide-react";
import { BusinessGrid } from "@/components/business/business-card";
import { CategoryIcon } from "@/components/business/category-icon";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { searchBusinesses } from "@/lib/data/businesses";
import { getCategories, getCities } from "@/lib/data/taxonomy";
import { parseDirectoryParams } from "@/lib/directory-params";
import { localizedName } from "@/lib/i18n-helpers";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  return category ? { category, categories } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return {};
  const locale = await getLocale();
  const t = await getTranslations("directory");
  const name = localizedName(data.category.name, data.category.name_translations, locale);
  return {
    title: t("metaTitleCategory", { category: name }),
    description: data.category.description ?? t("metaDescription"),
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const { category, categories } = data;
  const [locale, t, th, tc, tn, cities] = await Promise.all([
    getLocale(),
    getTranslations("directory"),
    getTranslations("home"),
    getTranslations("common"),
    getTranslations("nav"),
    getCities(),
  ]);
  const name = localizedName(category.name, category.name_translations, locale);
  const children = categories.filter((c) => c.parent_id === category.id);
  const result = await searchBusinesses(parseDirectoryParams({}, { category: slug }));
  const featuredCities = cities.filter((c) => c.isFeatured);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "MalluMarktplatz", path: "/" },
          { name: tn("categories"), path: "/categories" },
          { name, path: `/categories/${slug}` },
        ])}
      />
      <section className="bg-forest text-cream">
        <div className="hero-pattern">
          <div className="container-page flex flex-col gap-4 py-12 sm:flex-row sm:items-center">
            <span className="flex size-16 items-center justify-center rounded-2xl bg-cream/10 text-gold">
              <CategoryIcon icon={category.icon} className="size-8" />
            </span>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">{name}</h1>
              <p className="text-cream/75">{tc("businessesCount", { count: category.businessCount })}</p>
            </div>
          </div>
        </div>
        <div className="kasavu-rule" />
      </section>
      <div className="container-page space-y-10 py-10">
        {children.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {children.map((c) => (
              <li key={c.id}>
                <Link href={`/categories/${c.slug}`} className="rounded-full border border-border bg-card px-4 py-1.5 text-sm hover:border-forest">
                  {localizedName(c.name, c.name_translations, locale)}
                </Link>
              </li>
            ))}
          </ul>
        )}
        {result.items.length > 0 ? (
          <>
            <BusinessGrid businesses={result.items} />
            {result.total > result.items.length && (
              <Button asChild size="lg" variant="outline">
                <Link href={`/businesses/${slug}`}>
                  {th("viewAll")} <ArrowRight />
                </Link>
              </Button>
            )}
          </>
        ) : (
          <EmptyState icon={Store} title={t("emptyTitle")} description={t("emptyCta")} />
        )}
        {featuredCities.length > 0 && (
          <section>
            <h2 className="mb-3 text-lg font-semibold text-forest">{th("citiesTitle")}</h2>
            <ul className="flex flex-wrap gap-2">
              {featuredCities.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/businesses/${c.slug}/${slug}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:border-forest"
                  >
                    <MapPin className="size-3.5 text-gold-dark" aria-hidden="true" />
                    {t("titleCityCategory", { category: name, city: localizedName(c.name, c.name_translations, locale) })}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
