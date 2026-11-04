import Image from "next/image";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ArrowRight, MapPin } from "lucide-react";
import type { BusinessCardData } from "@/lib/data/businesses";
import { localizedName } from "@/lib/i18n-helpers";
import { mediaUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { DemoBadge, FeaturedBadge, VerifiedBadge } from "./badges";
import { CategoryIcon } from "./category-icon";

function BusinessLogo({ business, className }: { business: BusinessCardData; className?: string }) {
  const logo = mediaUrl(business.logo_path);
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary text-forest",
        className,
      )}
    >
      {logo ? (
        <Image src={logo} alt="" fill sizes="64px" className="object-cover" />
      ) : (
        <CategoryIcon icon={business.category?.icon} className="size-1/2" />
      )}
    </div>
  );
}

export function BusinessCard({ business, priority = false }: { business: BusinessCardData; priority?: boolean }) {
  const locale = useLocale();
  const cover = mediaUrl(business.cover_image_path);
  const categoryName = business.category
    ? localizedName(business.category.name, business.category.name_translations, locale)
    : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-forest to-forest-light">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            priority={priority}
          />
        ) : (
          <div className="hero-pattern absolute inset-0 flex items-center justify-center">
            <CategoryIcon icon={business.category?.icon} className="size-12 text-gold/70" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {business.is_featured && <FeaturedBadge />}
          {business.is_demo && <DemoBadge />}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="-mt-12 flex items-end gap-3">
          <BusinessLogo business={business} className="size-16 border-4 border-card shadow-sm" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg leading-snug font-semibold text-charcoal">
            <Link href={`/business/${business.slug}`} className="after:absolute after:inset-0 focus:outline-none">
              {business.name}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {categoryName && <span className="font-medium text-forest">{categoryName}</span>}
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden="true" />
              {business.city}
            </span>
          </p>
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-charcoal/80">{business.short_description}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          {business.is_verified ? <VerifiedBadge className="relative z-10" /> : <span />}
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-forest">
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}

export function BusinessListItem({ business }: { business: BusinessCardData }) {
  const locale = useLocale();
  const categoryName = business.category
    ? localizedName(business.category.name, business.category.name_translations, locale)
    : null;
  return (
    <article className="group relative flex gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md focus-within:ring-2 focus-within:ring-ring sm:p-5">
      <BusinessLogo business={business} className="size-16 sm:size-20" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-charcoal sm:text-lg">
            <Link href={`/business/${business.slug}`} className="after:absolute after:inset-0 focus:outline-none">
              {business.name}
            </Link>
          </h3>
          {business.is_verified && <VerifiedBadge className="relative z-10" />}
          {business.is_featured && <FeaturedBadge />}
          {business.is_demo && <DemoBadge className="relative z-10" />}
        </div>
        <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
          {categoryName && <span className="font-medium text-forest">{categoryName}</span>}
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5" aria-hidden="true" />
            {business.postal_code} {business.city}
          </span>
        </p>
        <p className="line-clamp-2 text-sm text-charcoal/80">{business.short_description}</p>
      </div>
    </article>
  );
}

export function BusinessGrid({ businesses }: { businesses: BusinessCardData[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {businesses.map((b, i) => (
        <li key={b.id}>
          <BusinessCard business={b} priority={i < 3} />
        </li>
      ))}
    </ul>
  );
}
