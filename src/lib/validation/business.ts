import { z } from "zod";
import { BUNDESLAENDER } from "@/config/site";
import { isValidHttpUrl, isValidPhone, normalizeUrl } from "@/lib/contact";
import { ISO_DAYS, isValidTime, type DayHours } from "@/lib/opening-hours";
import { MAX_GALLERY_IMAGES } from "@/lib/storage";
import type { SocialPlatform } from "@/lib/supabase/database.types";

export const SOCIAL_PLATFORMS = ["instagram", "facebook", "linkedin", "youtube", "tiktok", "x"] as const satisfies readonly SocialPlatform[];

const SOCIAL_HOSTS: Record<SocialPlatform, string[]> = {
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  linkedin: ["linkedin.com"],
  youtube: ["youtube.com", "youtu.be"],
  tiktok: ["tiktok.com"],
  x: ["x.com", "twitter.com"],
};

/** Validation error codes are translated in the UI (messages: validation.*). */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: "tooLong" })
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

const optionalPhone = optionalText(40).refine((v) => v === null || isValidPhone(v), { message: "invalidPhone" });

const storagePath = z.string().trim().max(300).regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._/-]+$/, { message: "invalidImage" });

const socialUrl = (platform: SocialPlatform) =>
  optionalText(300)
    .transform((v) => (v ? normalizeUrl(v) : null))
    .refine(
      (v) => {
        if (v === null) return true;
        if (!isValidHttpUrl(v) || !v.startsWith("https://")) return false;
        const host = new URL(v).hostname.replace(/^www\./, "").replace(/^m\./, "");
        return SOCIAL_HOSTS[platform].some((h) => host === h || host.endsWith(`.${h}`));
      },
      { message: "invalidSocialUrl" },
    );

const dayHoursSchema = z
  .object({
    day: z.coerce.number().int().min(1).max(7),
    closed: checkbox,
    opens: z.string().trim().optional().default(""),
    closes: z.string().trim().optional().default(""),
  })
  .superRefine((d, ctx) => {
    if (d.closed) return;
    const hasOpen = d.opens !== "";
    const hasClose = d.closes !== "";
    if (hasOpen !== hasClose) ctx.addIssue({ code: "custom", message: "incompleteHours", path: ["opens"] });
    if ((hasOpen && !isValidTime(d.opens)) || (hasClose && !isValidTime(d.closes)))
      ctx.addIssue({ code: "custom", message: "invalidTime", path: ["opens"] });
    if (hasOpen && hasClose && d.opens === d.closes)
      ctx.addIssue({ code: "custom", message: "invalidTime", path: ["opens"] });
  });

export const businessSchema = z.object({
  name: z.string().trim().min(2, { message: "required" }).max(120, { message: "tooLong" }),
  categoryId: z.uuid({ message: "required" }),
  subcategoryId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  shortDescription: z.string().trim().min(10, { message: "tooShort" }).max(200, { message: "tooLong" }),
  description: optionalText(5000),
  services: z
    .string()
    .optional()
    .default("")
    .transform((v) =>
      Array.from(
        new Set(
          v
            .split(/[,\n]/)
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ),
    )
    .refine((arr) => arr.length <= 20 && arr.every((s) => s.length <= 60), { message: "tooManyServices" }),
  ownerName: z.string().trim().min(2, { message: "required" }).max(120, { message: "tooLong" }),
  showOwnerName: checkbox,
  email: z.email({ message: "invalidEmail" }).trim().max(254),
  phone: optionalPhone,
  whatsapp: optionalPhone,
  website: optionalText(300)
    .transform((v) => (v ? normalizeUrl(v) : null))
    .refine((v) => v === null || isValidHttpUrl(v), { message: "invalidUrl" }),
  addressLine: optionalText(200),
  hideStreetAddress: checkbox,
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}$/, { message: "invalidPostalCode" }),
  city: z.string().trim().min(2, { message: "required" }).max(100, { message: "tooLong" }),
  bundesland: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || (BUNDESLAENDER as readonly string[]).includes(v), { message: "invalidState" }),
  logoPath: storagePath.optional().or(z.literal("")).transform((v) => v || null),
  coverPath: storagePath.optional().or(z.literal("")).transform((v) => v || null),
  galleryPaths: z.array(storagePath).max(MAX_GALLERY_IMAGES, { message: "tooManyImages" }).default([]),
  social: z.object({
    instagram: socialUrl("instagram"),
    facebook: socialUrl("facebook"),
    linkedin: socialUrl("linkedin"),
    youtube: socialUrl("youtube"),
    tiktok: socialUrl("tiktok"),
    x: socialUrl("x"),
  }),
  hours: z.array(dayHoursSchema).max(7).default([]),
});

export type BusinessInput = z.output<typeof businessSchema>;

export const createBusinessSchema = businessSchema.extend({
  consent: checkbox.refine((v) => v, { message: "consentRequired" }),
});

/** Converts submitted hours into rows; days without any value are omitted. */
export function normalizeHours(hours: BusinessInput["hours"]): DayHours[] {
  const seen = new Set<number>();
  const result: DayHours[] = [];
  for (const h of hours) {
    if (seen.has(h.day)) continue;
    seen.add(h.day);
    if (h.closed) {
      result.push({ day: h.day as DayHours["day"], closed: true, opens: null, closes: null });
    } else if (h.opens && h.closes) {
      result.push({ day: h.day as DayHours["day"], closed: false, opens: h.opens, closes: h.closes });
    }
  }
  return result.sort((a, b) => a.day - b.day);
}

/** Reads the business form's FormData into the shape expected by the schema. */
export function businessFormDataToObject(formData: FormData) {
  const get = (key: string) => {
    const v = formData.get(key);
    return typeof v === "string" ? v : undefined;
  };
  return {
    name: get("name"),
    categoryId: get("categoryId"),
    subcategoryId: get("subcategoryId"),
    shortDescription: get("shortDescription"),
    description: get("description"),
    services: get("services"),
    ownerName: get("ownerName"),
    showOwnerName: get("showOwnerName"),
    email: get("email"),
    phone: get("phone"),
    whatsapp: get("whatsapp"),
    website: get("website"),
    addressLine: get("addressLine"),
    hideStreetAddress: get("hideStreetAddress"),
    postalCode: get("postalCode"),
    city: get("city"),
    bundesland: get("bundesland"),
    logoPath: get("logoPath"),
    coverPath: get("coverPath"),
    galleryPaths: formData.getAll("galleryPaths").filter((v): v is string => typeof v === "string" && v !== ""),
    social: Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, get(`social.${p}`)])),
    hours: ISO_DAYS.map((day) => ({
      day,
      closed: get(`hours.${day}.closed`),
      opens: get(`hours.${day}.opens`),
      closes: get(`hours.${day}.closes`),
    })),
    consent: get("consent"),
  };
}

/** Flattens zod issues into { "field.path": "errorCode" } (first error per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message && /^[a-zA-Z]+$/.test(issue.message) ? issue.message : "invalid";
  }
  return out;
}
