import type { BusinessFormValues } from "@/actions/business";
import type { BusinessForEdit } from "@/lib/data/businesses";
import { ISO_DAYS, trimSeconds } from "@/lib/opening-hours";
import { SOCIAL_PLATFORMS } from "@/lib/validation/business";

export const EMPTY_FORM_VALUES: BusinessFormValues = {
  name: "",
  categoryId: "",
  subcategoryId: "",
  shortDescription: "",
  description: "",
  services: "",
  ownerName: "",
  showOwnerName: undefined,
  email: "",
  phone: "",
  whatsapp: "",
  website: "",
  addressLine: "",
  hideStreetAddress: undefined,
  postalCode: "",
  city: "",
  bundesland: "",
  logoPath: "",
  coverPath: "",
  galleryPaths: [],
  social: Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, ""])),
  hours: ISO_DAYS.map((day) => ({ day, closed: undefined, opens: "", closes: "" })),
  consent: undefined,
};

/** Builds form defaults from a stored business, overlaying pending (unreviewed) changes. */
export function businessToFormValues(b: BusinessForEdit): BusinessFormValues {
  const pending = (b.pending_changes && typeof b.pending_changes === "object" && !Array.isArray(b.pending_changes)
    ? b.pending_changes
    : {}) as Record<string, unknown>;
  const pick = <T,>(key: string, fallback: T): T => (key in pending ? (pending[key] as T) : fallback);
  const str = (v: unknown) => (typeof v === "string" ? v : "");

  const ownerDisplay = pick<string | null>("owner_display_name", b.owner_display_name);
  const hoursByDay = new Map(b.hours.map((h) => [h.day_of_week, h]));
  const socialByPlatform = new Map((b.social ?? []).map((s) => [s.platform, s.url]));

  return {
    name: str(pick("name", b.name)),
    categoryId: str(pick("category_id", b.category_id)),
    subcategoryId: str(pick("subcategory_id", b.subcategory_id)),
    shortDescription: str(pick("short_description", b.short_description)),
    description: str(pick("description", b.description)),
    services: b.services.join(", "),
    ownerName: b.owner_details?.owner_name ?? ownerDisplay ?? "",
    showOwnerName: ownerDisplay ? "on" : undefined,
    email: b.email ?? "",
    phone: b.phone ?? "",
    whatsapp: b.whatsapp ?? "",
    website: b.website ?? "",
    addressLine: str(pick("address_line", b.address_line)),
    hideStreetAddress: b.hide_street_address ? "on" : undefined,
    postalCode: str(pick("postal_code", b.postal_code)),
    city: str(pick("city", b.city)),
    bundesland: str(pick("bundesland", b.bundesland)),
    logoPath: str(pick("logo_path", b.logo_path)),
    coverPath: str(pick("cover_image_path", b.cover_image_path)),
    galleryPaths: b.images.map((i) => i.storage_path),
    social: Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, socialByPlatform.get(p) ?? ""])),
    hours: ISO_DAYS.map((day) => {
      const h = hoursByDay.get(day);
      return {
        day,
        closed: h?.is_closed ? "on" : undefined,
        opens: trimSeconds(h?.opens_at ?? null) ?? "",
        closes: trimSeconds(h?.closes_at ?? null) ?? "",
      };
    }),
    consent: undefined,
  };
}
