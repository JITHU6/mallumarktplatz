import { env } from "@/lib/env";
import type { BusinessDetail } from "@/lib/data/businesses";
import { mediaUrl } from "@/lib/storage";
import { trimSeconds } from "@/lib/opening-hours";

const SCHEMA_DAYS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Renders JSON-LD safely (escapes "<" to prevent breaking out of the script tag). */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MalluMarktplatz",
    url: env.siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: `${env.siteUrl}/businesses?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function localBusinessJsonLd(business: BusinessDetail) {
  const image = mediaUrl(business.cover_image_path) ?? mediaUrl(business.logo_path);
  const sameAs = (business.social ?? []).map((s) => s.url);
  if (business.website) sameAs.unshift(business.website);

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${env.siteUrl}/business/${business.slug}`,
    name: business.name,
    description: business.short_description,
    url: `${env.siteUrl}/business/${business.slug}`,
    ...(image ? { image } : {}),
    ...(mediaUrl(business.logo_path) ? { logo: mediaUrl(business.logo_path) } : {}),
    ...(business.phone ? { telephone: business.phone } : {}),
    ...(business.email ? { email: business.email } : {}),
    address: {
      "@type": "PostalAddress",
      ...(business.address_line && !business.hide_street_address ? { streetAddress: business.address_line } : {}),
      postalCode: business.postal_code,
      addressLocality: business.city,
      ...(business.bundesland ? { addressRegion: business.bundesland } : {}),
      addressCountry: business.country_code,
    },
    ...(business.latitude != null && business.longitude != null && !business.hide_street_address
      ? { geo: { "@type": "GeoCoordinates", latitude: business.latitude, longitude: business.longitude } }
      : {}),
    ...(business.hours.length > 0
      ? {
          openingHoursSpecification: business.hours
            .filter((h) => !h.is_closed && h.opens_at && h.closes_at)
            .map((h) => ({
              "@type": "OpeningHoursSpecification",
              dayOfWeek: `https://schema.org/${SCHEMA_DAYS[h.day_of_week]}`,
              opens: trimSeconds(h.opens_at),
              closes: trimSeconds(h.closes_at),
            })),
        }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${env.siteUrl}${item.path}`,
    })),
  };
}
