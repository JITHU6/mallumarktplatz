import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/slug";

describe("slugify", () => {
  it("transliterates German umlauts like the database function", () => {
    expect(slugify("München")).toBe("muenchen");
    expect(slugify("Düsseldorf Straße")).toBe("duesseldorf-strasse");
    expect(slugify("Köln")).toBe("koeln");
  });

  it("removes accents and punctuation", () => {
    expect(slugify("Café & Crème – Frankfurt a.M.")).toBe("cafe-creme-frankfurt-a-m");
  });

  it("trims dashes and collapses separators", () => {
    expect(slugify("  --Kerala   Kitchen!!  ")).toBe("kerala-kitchen");
  });

  it("returns an empty string for non-latin input", () => {
    expect(slugify("കേരള")).toBe("");
  });
});
