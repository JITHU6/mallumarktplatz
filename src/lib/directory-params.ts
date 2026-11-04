import { PAGE_SIZE } from "@/config/site";

export const SORT_OPTIONS = ["relevance", "newest", "name"] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
export const VIEW_OPTIONS = ["grid", "list", "map"] as const;
export type ViewOption = (typeof VIEW_OPTIONS)[number];

export type DirectoryParams = {
  q: string;
  category: string | null;
  city: string | null;
  postalCode: string;
  verified: boolean;
  sort: SortOption;
  view: ViewOption;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function parseDirectoryParams(
  raw: RawParams,
  fromPath: { category?: string | null; city?: string | null } = {},
): DirectoryParams {
  const sort = first(raw.sort);
  const view = first(raw.view);
  const page = Number.parseInt(first(raw.page), 10);
  const category = fromPath.category ?? first(raw.category);
  const city = fromPath.city ?? first(raw.city);
  return {
    q: first(raw.q).slice(0, 100),
    category: SLUG.test(category) ? category : null,
    city: SLUG.test(city) ? city : null,
    postalCode: first(raw.plz).replace(/\D/g, "").slice(0, 5),
    verified: first(raw.verified) === "1",
    sort: (SORT_OPTIONS as readonly string[]).includes(sort) ? (sort as SortOption) : "relevance",
    view: (VIEW_OPTIONS as readonly string[]).includes(view) ? (view as ViewOption) : "grid",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 500) : 1,
  };
}

/** Canonical SEO-friendly path: /businesses[/city][/category] */
export function directoryPath(city: string | null, category: string | null): string {
  return ["/businesses", city, category].filter(Boolean).join("/");
}

/** Builds a directory URL, keeping city/category in the path. */
export function directoryHref(params: Partial<DirectoryParams>): string {
  const path = directoryPath(params.city ?? null, params.category ?? null);
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.postalCode) search.set("plz", params.postalCode);
  if (params.verified) search.set("verified", "1");
  if (params.sort && params.sort !== "relevance") search.set("sort", params.sort);
  if (params.view && params.view !== "grid") search.set("view", params.view);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function pageRange(page: number, total: number, pageSize = PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, totalPages);
  return { totalPages, current, from: (current - 1) * pageSize, to: current * pageSize - 1 };
}

/** Splits a free text query into safe search terms for ILIKE filters. */
export function searchTerms(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[%_\\,()"'.:*]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 6);
}
