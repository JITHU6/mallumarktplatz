import { describe, expect, it } from "vitest";
import { directoryHref, pageRange, parseDirectoryParams, searchTerms } from "@/lib/directory-params";
import { negotiateLocale } from "@/i18n/config";
import { isOwnStoragePath } from "@/lib/storage";
import { safeNextPath } from "@/lib/validation/auth";

describe("directory params", () => {
  it("parses and sanitises search params", () => {
    const p = parseDirectoryParams({ q: " curry ", plz: "80a33", sort: "bogus", view: "map", page: "-3", verified: "1" });
    expect(p).toMatchObject({ q: "curry", postalCode: "8033", sort: "relevance", view: "map", page: 1, verified: true });
  });

  it("prefers path segments over query params", () => {
    const p = parseDirectoryParams({ category: "grocery" }, { city: "munich", category: "restaurants" });
    expect(p.city).toBe("munich");
    expect(p.category).toBe("restaurants");
  });

  it("rejects invalid slugs", () => {
    expect(parseDirectoryParams({ city: "../admin" }).city).toBeNull();
  });

  it("builds canonical SEO-friendly URLs", () => {
    expect(directoryHref({ city: "munich", category: "restaurants" })).toBe("/businesses/munich/restaurants");
    expect(directoryHref({ category: "healthcare", q: "dentist", page: 2, sort: "name" })).toBe(
      "/businesses/healthcare?q=dentist&sort=name&page=2",
    );
    expect(directoryHref({})).toBe("/businesses");
  });

  it("computes page ranges", () => {
    expect(pageRange(2, 30, 12)).toEqual({ totalPages: 3, current: 2, from: 12, to: 23 });
    expect(pageRange(9, 30, 12).current).toBe(3);
    expect(pageRange(1, 0, 12)).toEqual({ totalPages: 1, current: 1, from: 0, to: 11 });
  });

  it("strips PostgREST/LIKE special characters from search terms", () => {
    expect(searchTerms("kerala, (food) % _ a")).toEqual(["kerala", "food"]);
  });
});

describe("security helpers", () => {
  it("only allows relative redirect targets", () => {
    expect(safeNextPath("/dashboard/businesses")).toBe("/dashboard/businesses");
    expect(safeNextPath("https://evil.com")).toBe("/dashboard");
    expect(safeNextPath("//evil.com")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.com")).toBe("/dashboard");
    expect(safeNextPath(null)).toBe("/dashboard");
  });

  it("checks storage path ownership", () => {
    const user = "11111111-1111-1111-1111-111111111111";
    expect(isOwnStoragePath(`${user}/a.png`, user)).toBe(true);
    expect(isOwnStoragePath(`22222222-2222-2222-2222-222222222222/a.png`, user)).toBe(false);
    expect(isOwnStoragePath(`${user}/../x.png`, user)).toBe(false);
  });

  it("negotiates the UI language", () => {
    expect(negotiateLocale("de-DE,de;q=0.9,en;q=0.8")).toBe("de");
    expect(negotiateLocale("fr-FR,ml;q=0.5")).toBe("ml");
    expect(negotiateLocale("fr-FR")).toBe("en");
    expect(negotiateLocale(null)).toBe("en");
  });
});
