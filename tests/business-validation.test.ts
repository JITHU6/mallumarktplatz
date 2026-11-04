import { describe, expect, it } from "vitest";
import {
  businessFormDataToObject,
  createBusinessSchema,
  fieldErrors,
  normalizeHours,
} from "@/lib/validation/business";

const UUID = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
const USER = "11111111-1111-1111-1111-111111111111";

function form(overrides: Record<string, string | string[]> = {}) {
  const fd = new FormData();
  const base: Record<string, string | string[]> = {
    name: "Kerala Kitchen",
    categoryId: UUID,
    shortDescription: "Authentic Kerala food in Munich.",
    ownerName: "Anu Thomas",
    email: "info@kerala-kitchen.de",
    postalCode: "80331",
    city: "München",
    consent: "on",
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) {
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
    else fd.set(k, v);
  }
  return fd;
}

describe("business form validation", () => {
  it("accepts a minimal valid submission", () => {
    const result = createBusinessSchema.safeParse(businessFormDataToObject(form()));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.showOwnerName).toBe(false);
      expect(result.data.services).toEqual([]);
      expect(result.data.website).toBeNull();
    }
  });

  it("requires consent when creating a listing", () => {
    const result = createBusinessSchema.safeParse(businessFormDataToObject(form({ consent: "" })));
    expect(result.success).toBe(false);
    if (!result.success) expect(fieldErrors(result.error).consent).toBe("consentRequired");
  });

  it("reports translated error codes per field", () => {
    const result = createBusinessSchema.safeParse(
      businessFormDataToObject(form({ email: "not-an-email", postalCode: "123", shortDescription: "short" })),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = fieldErrors(result.error);
      expect(errors.email).toBe("invalidEmail");
      expect(errors.postalCode).toBe("invalidPostalCode");
      expect(errors.shortDescription).toBe("tooShort");
    }
  });

  it("normalises website and services", () => {
    const result = createBusinessSchema.safeParse(
      businessFormDataToObject(form({ website: "kerala-kitchen.de", services: "Catering, Lunch,\nCatering ,  " })),
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBe("https://kerala-kitchen.de");
      expect(result.data.services).toEqual(["Catering", "Lunch"]);
    }
  });

  it("validates social links against the platform domain", () => {
    const bad = createBusinessSchema.safeParse(
      businessFormDataToObject(form({ "social.instagram": "https://evil.example.com/profile" })),
    );
    expect(bad.success).toBe(false);
    const good = createBusinessSchema.safeParse(
      businessFormDataToObject(form({ "social.instagram": "instagram.com/keralakitchen" })),
    );
    expect(good.success).toBe(true);
    if (good.success) expect(good.data.social.instagram).toBe("https://instagram.com/keralakitchen");
  });

  it("rejects storage paths outside the expected format", () => {
    const result = createBusinessSchema.safeParse(businessFormDataToObject(form({ logoPath: "../../etc/passwd" })));
    expect(result.success).toBe(false);
    const ok = createBusinessSchema.safeParse(businessFormDataToObject(form({ logoPath: `${USER}/logo.png` })));
    expect(ok.success).toBe(true);
  });

  it("validates and normalises opening hours", () => {
    const incomplete = createBusinessSchema.safeParse(businessFormDataToObject(form({ "hours.1.opens": "09:00" })));
    expect(incomplete.success).toBe(false);
    if (!incomplete.success) expect(fieldErrors(incomplete.error)["hours.0.opens"]).toBe("incompleteHours");

    const valid = createBusinessSchema.safeParse(
      businessFormDataToObject(
        form({ "hours.1.opens": "09:00", "hours.1.closes": "18:00", "hours.7.closed": "on" }),
      ),
    );
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(normalizeHours(valid.data.hours)).toEqual([
        { day: 1, closed: false, opens: "09:00", closes: "18:00" },
        { day: 7, closed: true, opens: null, closes: null },
      ]);
    }
  });
});
