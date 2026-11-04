import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckCircle2, MapPinned, ShieldCheck, Store, Users } from "lucide-react";
import { BusinessGrid } from "@/components/business/business-card";
import { EmptyState } from "@/components/empty-state";
import { CategoryGrid } from "@/components/home/category-grid";
import { CityGrid } from "@/components/home/city-grid";
import { HeroSearch } from "@/components/home/hero-search";
import { SectionHeading } from "@/components/home/section-heading";
import { SetupNotice } from "@/components/setup-notice";
import { Button } from "@/components/ui/button";
import { getFeaturedBusinesses, getRecentBusinesses } from "@/lib/data/businesses";
import { getCategories, getCities } from "@/lib/data/taxonomy";
import { env } from "@/lib/env";
import { JsonLd, websiteJsonLd } from "@/lib/seo";

export default async function HomePage() {
  if (!env.supabaseUrl) return <SetupNotice />;

  const t = await getTranslations("home");
  const [categories, cities, featured, recent] = await Promise.all([
    getCategories(),
    getCities(),
    getFeaturedBusinesses(6),
    getRecentBusinesses(6),
  ]);
  const topCategories = categories.filter((c) => !c.parent_id);
  const featuredCities = cities.filter((c) => c.isFeatured).slice(0, 10);
  const popularCities = featuredCities.slice(0, 4);

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-forest text-cream">
        <div className="hero-pattern absolute inset-0" aria-hidden="true" />
        <div className="container-page relative py-16 sm:py-24">
          <div className="max-w-3xl space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold tracking-wider text-gold uppercase">
              {t("heroEyebrow")}
            </p>
            <h1 className="text-4xl leading-tight font-extrabold sm:text-5xl lg:text-6xl">{t("heroTitle")}</h1>
            <p className="max-w-2xl text-lg leading-relaxed text-cream/80">{t("heroSubtitle")}</p>
          </div>
          <div className="mt-10 max-w-5xl">
            <HeroSearch categories={categories} />
            {popularCities.length > 0 && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-cream/70">
                <span>{t("popular")}</span>
                {popularCities.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/businesses/${c.slug}`}
                    className="rounded-full border border-cream/20 px-3 py-1 text-cream/90 transition-colors hover:border-gold hover:text-gold"
                  >
                    {c.name}
                  </Link>
                ))}
              </p>
            )}
          </div>
        </div>
        <div className="kasavu-rule relative" />
      </section>

      {/* Trust points */}
      <section className="border-b border-border bg-card">
        <ul className="container-page grid gap-6 py-8 md:grid-cols-3">
          {[
            { Icon: Users, title: t("trust1Title"), text: t("trust1Text") },
            { Icon: MapPinned, title: t("trust2Title"), text: t("trust2Text") },
            { Icon: ShieldCheck, title: t("trust3Title"), text: t("trust3Text") },
          ].map(({ Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-gold-dark">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-charcoal">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="container-page py-16" aria-labelledby="categories-heading">
        <SectionHeading
          id="categories-heading"
          title={t("categoriesTitle")}
          subtitle={t("categoriesSubtitle")}
          href="/categories"
          linkLabel={t("viewAllCategories")}
        />
        <CategoryGrid categories={topCategories} />
      </section>

      <section className="bg-secondary/50 py-16" aria-labelledby="featured-heading">
        <div className="container-page">
          <SectionHeading
            id="featured-heading"
            title={t("featuredTitle")}
            subtitle={t("featuredSubtitle")}
            href="/businesses"
            linkLabel={t("viewAll")}
          />
          {featured.length > 0 ? (
            <BusinessGrid businesses={featured} />
          ) : (
            <EmptyState icon={Store} title={t("featuredEmpty")} />
          )}
        </div>
      </section>

      <section className="container-page py-16" aria-labelledby="recent-heading">
        <SectionHeading
          id="recent-heading"
          title={t("recentTitle")}
          subtitle={t("recentSubtitle")}
          href="/businesses?sort=newest"
          linkLabel={t("viewAll")}
        />
        {recent.length > 0 ? (
          <BusinessGrid businesses={recent} />
        ) : (
          <EmptyState icon={Store} title={t("recentEmpty")}>
            <Button asChild>
              <Link href="/register-business">{t("ctaButton")}</Link>
            </Button>
          </EmptyState>
        )}
      </section>

      {featuredCities.length > 0 && (
        <section className="container-page pb-16" aria-labelledby="cities-heading">
          <SectionHeading id="cities-heading" title={t("citiesTitle")} subtitle={t("citiesSubtitle")} />
          <CityGrid cities={featuredCities} />
        </section>
      )}

      {/* CTA */}
      <section className="container-page pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-forest px-6 py-12 text-cream sm:px-12">
          <div className="hero-pattern absolute inset-0" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold sm:text-4xl">{t("ctaTitle")}</h2>
              <p className="text-lg text-cream/80">{t("ctaSubtitle")}</p>
              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/90">
                {[t("ctaPoint1"), t("ctaPoint2"), t("ctaPoint3")].map((p) => (
                  <li key={p} className="inline-flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-gold" aria-hidden="true" /> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lg:text-right">
              <Button asChild size="lg" className="h-12 bg-gold px-6 text-base text-charcoal hover:bg-gold-dark hover:text-white">
                <Link href="/register-business">{t("ctaButton")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
