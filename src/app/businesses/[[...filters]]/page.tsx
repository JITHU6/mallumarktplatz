import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { BusinessGrid, BusinessListItem } from "@/components/business/business-card";
import { DirectoryFilters } from "@/components/directory/directory-filters";
import { DirectoryPagination } from "@/components/directory/directory-pagination";
import { DirectoryToolbar } from "@/components/directory/directory-toolbar";
import { MapView } from "@/components/directory/map-view";
import { EmptyState } from "@/components/empty-state";
import { SetupNotice } from "@/components/setup-notice";
import { Button } from "@/components/ui/button";
import { searchBusinesses } from "@/lib/data/businesses";
import { getCategories, getCities, resolveCitySlug } from "@/lib/data/taxonomy";
import { directoryHref, directoryPath, parseDirectoryParams } from "@/lib/directory-params";
import { env } from "@/lib/env";
import { localizedName } from "@/lib/i18n-helpers";
import { breadcrumbJsonLd, JsonLd } from "@/lib/seo";

type Props = {
  params: Promise<{ filters?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Resolves /businesses/[city-or-category]/[category] path segments. */
async function resolveSegments(filters: string[] = []) {
  if (filters.length > 2) return null;
  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  const isCategory = (s: string) => categories.some((c) => c.slug === s);
  const isCity = (s: string) => cities.some((c) => c.slug === s);

  if (filters.length === 0) return { city: null, category: null };
  if (filters.length === 1) {
    const [a] = filters;
    if (isCategory(a)) return { city: null, category: a };
    if (isCity(a)) return { city: a, category: null };
    return null;
  }
  const [a, b] = filters;
  if (isCity(a) && isCategory(b)) return { city: a, category: b };
  return null;
}

async function loadContext(props: Props) {
  const [{ filters }, raw] = await Promise.all([props.params, props.searchParams]);
  const segments = await resolveSegments(filters);
  if (!segments) notFound();
  const params = parseDirectoryParams(raw, segments);
  const [categories, cities, locale] = await Promise.all([getCategories(), getCities(), getLocale()]);
  const category = categories.find((c) => c.slug === params.category) ?? null;
  const city = cities.find((c) => c.slug === params.city) ?? null;
  return {
    raw,
    segments,
    params,
    categories,
    cities,
    category,
    city,
    categoryName: category ? localizedName(category.name, category.name_translations, locale) : null,
    cityName: city ? localizedName(city.name, city.name_translations, locale) : null,
  };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  if (!env.supabaseUrl) return {};
  const t = await getTranslations("directory");
  const { params, categoryName, cityName } = await loadContext(props);
  const title =
    categoryName && cityName
      ? t("metaTitleCityCategory", { category: categoryName, city: cityName })
      : cityName
        ? t("metaTitleCity", { city: cityName })
        : categoryName
          ? t("metaTitleCategory", { category: categoryName })
          : t("metaTitle");
  const canonical = directoryPath(params.city, params.category);
  const hasFreeFilters = Boolean(params.q || params.postalCode || params.verified || params.view !== "grid");
  return {
    title,
    description: t("metaDescription"),
    alternates: { canonical },
    openGraph: { title, description: t("metaDescription"), url: canonical },
    robots: hasFreeFilters ? { index: false, follow: true } : undefined,
  };
}

export default async function DirectoryPage(props: Props) {
  if (!env.supabaseUrl) return <SetupNotice />;
  const t = await getTranslations("directory");
  const ctx = await loadContext(props);
  const { raw, params } = ctx;

  // Normalise legacy/query-based filters (e.g. from the homepage search form) into SEO-friendly paths.
  const qCategory = typeof raw.category === "string" ? raw.category : undefined;
  const qCity = typeof raw.city === "string" ? raw.city : undefined;
  const location = typeof raw.location === "string" ? raw.location.trim() : undefined;
  if (qCategory !== undefined || qCity !== undefined || location !== undefined) {
    const next = { ...params };
    if (qCategory) next.category = ctx.categories.some((c) => c.slug === qCategory) ? qCategory : null;
    if (qCity) next.city = ctx.cities.some((c) => c.slug === qCity) ? qCity : null;
    if (location) {
      if (/^\d{1,5}$/.test(location)) {
        next.postalCode = location;
      } else {
        const slug = await resolveCitySlug(location);
        if (slug) next.city = slug;
        else next.q = [params.q, location].filter(Boolean).join(" ");
      }
    }
    redirect(directoryHref({ ...next, page: 1 }));
  }
  if (params.page > 1 && raw.page === "1") permanentRedirect(directoryHref(params));

  const isMap = params.view === "map";
  const result = await searchBusinesses(params, { mapMode: isMap });

  const title =
    ctx.categoryName && ctx.cityName
      ? t("titleCityCategory", { category: ctx.categoryName, city: ctx.cityName })
      : ctx.cityName
        ? t("titleCity", { city: ctx.cityName })
        : ctx.categoryName
          ? t("titleCategory", { category: ctx.categoryName })
          : t("title");

  const crumbs = [{ name: "MalluMarktplatz", path: "/" }, { name: t("title"), path: "/businesses" }];
  if (ctx.city) crumbs.push({ name: ctx.cityName!, path: directoryPath(ctx.city.slug, null) });
  if (ctx.category) crumbs.push({ name: ctx.categoryName!, path: directoryPath(params.city, ctx.category.slug) });

  return (
    <div className="container-page py-8 sm:py-12">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-bold text-forest sm:text-4xl">{title}</h1>
        <p className="text-muted-foreground" aria-live="polite">
          {t("results", { count: result.total })}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <DirectoryFilters params={params} categories={ctx.categories} cities={ctx.cities} />

        <div className="min-w-0 space-y-6">
          <DirectoryToolbar params={params} />

          {result.items.length === 0 && !isMap ? (
            <EmptyState icon={SearchX} title={t("emptyTitle")} description={t("emptyDescription")}>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline">
                  <Link href="/businesses">{t("reset")}</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/categories">{t("allCategories")}</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("emptyCta")}</p>
            </EmptyState>
          ) : isMap ? (
            <MapView
              businesses={result.items.map((b) => ({
                id: b.id,
                slug: b.slug,
                name: b.name,
                city: b.city,
                latitude: b.latitude!,
                longitude: b.longitude!,
              }))}
              total={result.total}
            />
          ) : params.view === "list" ? (
            <ul className="space-y-3">
              {result.items.map((b) => (
                <li key={b.id}>
                  <BusinessListItem business={b} />
                </li>
              ))}
            </ul>
          ) : (
            <BusinessGrid businesses={result.items} />
          )}

          {!isMap && result.totalPages > 1 && (
            <DirectoryPagination params={{ ...params, page: result.page }} totalPages={result.totalPages} />
          )}
        </div>
      </div>
    </div>
  );
}
