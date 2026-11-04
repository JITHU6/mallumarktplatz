import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Globe, Mail, MapPin, MessageCircle, Navigation, Phone, TriangleAlert, UserRound } from "lucide-react";
import { DemoBadge, FeaturedBadge, StatusBadge, VerifiedBadge } from "@/components/business/badges";
import { CategoryIcon } from "@/components/business/category-icon";
import { FavouriteButton } from "@/components/business/favourite-button";
import { OpeningHoursTable } from "@/components/business/opening-hours-table";
import { ReportDialog } from "@/components/business/report-dialog";
import { ViewBeacon } from "@/components/business/view-beacon";
import { BusinessMap } from "@/components/directory/business-map";
import { socialIcons, socialLabels } from "@/components/icons/social-icons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { directionsHref, displayHost, telHref, whatsappHref } from "@/lib/contact";
import { getBusinessBySlug } from "@/lib/data/businesses";
import { env } from "@/lib/env";
import { localizedName } from "@/lib/i18n-helpers";
import { breadcrumbJsonLd, JsonLd, localBusinessJsonLd } from "@/lib/seo";
import { mediaUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) return {};
  const title = `${business.name} – ${business.city}`;
  const image = mediaUrl(business.cover_image_path) ?? mediaUrl(business.logo_path);
  return {
    title,
    description: business.short_description,
    alternates: { canonical: `/business/${business.slug}` },
    openGraph: {
      type: "website",
      title,
      description: business.short_description,
      url: `/business/${business.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    robots: business.status !== "approved" || business.is_demo ? { index: false, follow: false } : undefined,
  };
}

export default async function BusinessPage({ params }: Props) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const [t, tc, locale, format, user] = await Promise.all([
    getTranslations("business"),
    getTranslations("common"),
    getLocale(),
    getFormatter(),
    getCurrentUser(),
  ]);

  let isFavourite = false;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("favourites")
      .select("business_id")
      .eq("user_id", user.id)
      .eq("business_id", business.id)
      .maybeSingle();
    isFavourite = Boolean(data);
  }

  const categoryName = business.category
    ? localizedName(business.category.name, business.category.name_translations, locale)
    : null;
  const subcategoryName = business.subcategory
    ? localizedName(business.subcategory.name, business.subcategory.name_translations, locale)
    : null;
  const cover = mediaUrl(business.cover_image_path);
  const logo = mediaUrl(business.logo_path);
  const showStreet = Boolean(business.address_line) && !business.hide_street_address;
  const addressParts = [showStreet ? business.address_line : null, `${business.postal_code} ${business.city}`];
  const directions = directionsHref([...addressParts, business.country_code === "DE" ? "Germany" : null]);
  const hasMap = Boolean(env.mapboxToken && business.latitude != null && business.longitude != null && showStreet);
  const isPublic = business.status === "approved";

  return (
    <>
      {isPublic && <ViewBeacon businessId={business.id} />}
      {isPublic && <JsonLd data={localBusinessJsonLd(business)} />}
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "MalluMarktplatz", path: "/" },
          ...(business.category ? [{ name: categoryName!, path: `/businesses/${business.category.slug}` }] : []),
          { name: business.name, path: `/business/${business.slug}` },
        ])}
      />

      {/* Cover */}
      <div className="relative h-48 bg-forest sm:h-64 lg:h-80">
        {cover ? (
          <Image src={cover} alt={t("coverAlt", { name: business.name })} fill priority sizes="100vw" className="object-cover" />
        ) : (
          <div className="hero-pattern absolute inset-0" aria-hidden="true" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" aria-hidden="true" />
      </div>

      <div className="container-page -mt-16 pb-16 sm:-mt-20">
        {!isPublic && (
          <Alert className="mb-4 border-amber-300 bg-amber-50">
            <TriangleAlert />
            <AlertDescription className="flex flex-wrap items-center gap-2 text-amber-900">
              <StatusBadge status={business.status} />
              {business.status === "pending"
                ? t("pendingNotice")
                : business.status === "rejected"
                  ? t("rejectedNotice")
                  : t("suspendedNotice")}
            </AlertDescription>
          </Alert>
        )}
        {business.is_demo && (
          <Alert className="mb-4 border-dashed">
            <TriangleAlert />
            <AlertDescription>{t("demoNotice")}</AlertDescription>
          </Alert>
        )}

        {/* Header card */}
        <div className="relative rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-secondary text-forest shadow-md sm:size-28">
              {logo ? (
                <Image src={logo} alt={t("logoAlt", { name: business.name })} fill sizes="112px" className="object-cover" />
              ) : (
                <CategoryIcon icon={business.category?.icon} className="size-12" />
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {business.is_verified && <VerifiedBadge />}
                {business.is_featured && <FeaturedBadge />}
                {business.is_demo && <DemoBadge />}
              </div>
              <h1 className="text-3xl font-bold text-forest sm:text-4xl">{business.name}</h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
                {business.category && (
                  <Link href={`/businesses/${business.category.slug}`} className="font-medium text-forest hover:underline">
                    {categoryName}
                    {subcategoryName ? ` · ${subcategoryName}` : ""}
                  </Link>
                )}
                <Link href={`/businesses/${business.city_slug}`} className="inline-flex items-center gap-1 hover:underline">
                  <MapPin className="size-4" aria-hidden="true" /> {business.city}
                </Link>
              </p>
              <p className="max-w-3xl text-lg text-charcoal/85">{business.short_description}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            {business.phone && (
              <Button asChild size="lg">
                <a href={telHref(business.phone)}>
                  <Phone /> {t("call")}
                </a>
              </Button>
            )}
            {business.whatsapp && (
              <Button asChild size="lg" className="bg-[#1f7a4d] hover:bg-[#1a6942]">
                <a href={whatsappHref(business.whatsapp)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> {t("whatsapp")}
                </a>
              </Button>
            )}
            {business.email && (
              <Button asChild size="lg" variant="outline">
                <a href={`mailto:${business.email}`}>
                  <Mail /> {t("sendEmail")}
                </a>
              </Button>
            )}
            {business.website && (
              <Button asChild size="lg" variant="outline">
                <a href={business.website} target="_blank" rel="noopener noreferrer nofollow ugc">
                  <Globe /> {t("visitWebsite")}
                </a>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <a href={directions} target="_blank" rel="noopener noreferrer">
                <Navigation /> {t("getDirections")}
              </a>
            </Button>
            {isPublic && (
              <FavouriteButton
                businessId={business.id}
                initialSaved={isFavourite}
                isLoggedIn={Boolean(user)}
                returnTo={`/business/${business.slug}`}
              />
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-8">
            {business.description && (
              <Section title={t("about")}>
                <p className="leading-relaxed whitespace-pre-line text-charcoal/90">{business.description}</p>
              </Section>
            )}
            {business.services.length > 0 && (
              <Section title={t("services")}>
                <ul className="flex flex-wrap gap-2">
                  {business.services.map((s) => (
                    <li key={s} className="rounded-full border border-border bg-secondary px-3 py-1 text-sm text-forest">
                      {s}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
            {business.images.length > 0 && (
              <Section title={t("gallery")}>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {business.images.map((img, i) => {
                    const url = mediaUrl(img.storage_path)!;
                    return (
                      <li key={img.id}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative block aspect-[4/3] overflow-hidden rounded-xl bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Image
                            src={url}
                            alt={img.alt_text || t("galleryAlt", { name: business.name, index: i + 1 })}
                            fill
                            sizes="(min-width: 1024px) 25vw, 50vw"
                            className="object-cover transition-transform hover:scale-105"
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}
            {hasMap && (
              <Section title={t("mapTitle")}>
                <BusinessMap
                  businesses={[
                    {
                      id: business.id,
                      slug: business.slug,
                      name: business.name,
                      city: business.city,
                      latitude: business.latitude!,
                      longitude: business.longitude!,
                    },
                  ]}
                  className="h-72"
                />
              </Section>
            )}
          </div>

          <aside className="space-y-6">
            <Section title={t("contact")} card>
              <dl className="space-y-4 text-sm">
                <ContactRow icon={MapPin} label={t("address")}>
                  <address className="not-italic">
                    {showStreet && <span className="block">{business.address_line}</span>}
                    <span className="block">
                      {business.postal_code} {business.city}
                    </span>
                    {business.bundesland && <span className="block text-muted-foreground">{business.bundesland}</span>}
                    {!showStreet && business.address_line && (
                      <span className="block text-xs text-muted-foreground">{t("addressHidden")}</span>
                    )}
                  </address>
                </ContactRow>
                {business.phone && (
                  <ContactRow icon={Phone} label={t("phone")}>
                    <a href={telHref(business.phone)} className="hover:underline">
                      {business.phone}
                    </a>
                  </ContactRow>
                )}
                {business.whatsapp && (
                  <ContactRow icon={MessageCircle} label={t("whatsapp")}>
                    <a href={whatsappHref(business.whatsapp)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {business.whatsapp}
                    </a>
                  </ContactRow>
                )}
                {business.email && (
                  <ContactRow icon={Mail} label={t("email")}>
                    <a href={`mailto:${business.email}`} className="break-all hover:underline">
                      {business.email}
                    </a>
                  </ContactRow>
                )}
                {business.website && (
                  <ContactRow icon={Globe} label={t("website")}>
                    <a href={business.website} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all hover:underline">
                      {displayHost(business.website)}
                    </a>
                  </ContactRow>
                )}
                {business.owner_display_name && (
                  <ContactRow icon={UserRound} label={t("owner")}>
                    {business.owner_display_name}
                  </ContactRow>
                )}
              </dl>
              {business.social.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <h3 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t("social")}</h3>
                  <ul className="flex flex-wrap gap-2">
                    {business.social.map((s) => {
                      const Icon = socialIcons[s.platform];
                      return (
                        <li key={s.platform}>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow ugc"
                            aria-label={socialLabels[s.platform]}
                            className="flex size-10 items-center justify-center rounded-full bg-secondary text-forest transition-colors hover:bg-forest hover:text-gold"
                          >
                            <Icon className="size-4" />
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </Section>

            <Section title={t("openingHours")} card>
              <OpeningHoursTable hours={business.hours} />
            </Section>

            <div className="flex flex-col gap-1 px-1 text-xs text-muted-foreground">
              {business.approved_at && (
                <span>{t("listedSince", { date: format.dateTime(new Date(business.approved_at), { month: "long", year: "numeric" }) })}</span>
              )}
              {business.is_verified ? <span>{tc("verifiedHint")}</span> : null}
              {isPublic && <ReportDialog businessId={business.id} />}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

function Section({ title, children, card = false }: { title: string; children: React.ReactNode; card?: boolean }) {
  return (
    <section className={card ? "rounded-2xl border border-border bg-card p-5 shadow-sm" : undefined}>
      <h2 className="mb-4 text-xl font-semibold text-forest">{title}</h2>
      {children}
    </section>
  );
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-gold-dark" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="sr-only">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}
