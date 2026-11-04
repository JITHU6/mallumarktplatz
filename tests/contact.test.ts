import { describe, expect, it } from "vitest";
import {
  directionsHref,
  isValidHttpUrl,
  isValidPhone,
  normalizeUrl,
  telHref,
  toInternationalDigits,
  whatsappHref,
} from "@/lib/contact";

describe("contact helpers", () => {
  it("normalises URLs without scheme", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("  ")).toBe("");
  });

  it("validates URLs", () => {
    expect(isValidHttpUrl("https://example.de/path")).toBe(true);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("https://localhost")).toBe(false);
  });

  it("validates phone numbers", () => {
    expect(isValidPhone("+49 89 1234567")).toBe(true);
    expect(isValidPhone("089 / 123 456")).toBe(true);
    expect(isValidPhone("call me")).toBe(false);
    expect(isValidPhone("123")).toBe(false);
  });

  it("converts German numbers to international format", () => {
    expect(toInternationalDigits("0176 1234567")).toBe("491761234567");
    expect(toInternationalDigits("+49 176 1234567")).toBe("491761234567");
    expect(toInternationalDigits("0049 176 1234567")).toBe("491761234567");
    expect(toInternationalDigits("+91 98470 12345")).toBe("919847012345");
  });

  it("builds tel, WhatsApp and directions links", () => {
    expect(telHref("089 123456")).toBe("tel:+4989123456");
    expect(whatsappHref("0176 1234567")).toBe("https://wa.me/491761234567");
    expect(directionsHref(["Hauptstr. 1", null, "80331 München"])).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=Hauptstr.%201%2C%2080331%20M%C3%BCnchen",
    );
  });
});
