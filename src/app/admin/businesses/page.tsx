import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { BadgeCheck, PencilLine, Star } from "lucide-react";
import { StatusBadge } from "@/components/business/badges";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdmin } from "@/lib/auth";
import { searchTerms } from "@/lib/directory-params";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const PAGE = 50;
const FILTERS = ["all", "pending", "changes", "approved", "rejected", "suspended"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AdminBusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const filter: Filter = (FILTERS as readonly string[]).includes(sp.status ?? "") ? (sp.status as Filter) : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const [t, ts, format] = await Promise.all([getTranslations("admin"), getTranslations("status"), getFormatter()]);
  const supabase = await createClient();

  let query = supabase
    .from("businesses")
    .select(
      "id, name, city, status, is_featured, is_verified, is_demo, pending_changes, created_at, category:business_categories!businesses_category_id_fkey(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (filter === "changes") query = query.not("pending_changes", "is", null);
  else if (filter !== "all") query = query.eq("status", filter);
  for (const term of searchTerms(sp.q ?? "")) query = query.ilike("name", `%${term}%`);
  const { data, count } = await query;
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  const href = (patch: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged = { status: filter === "all" ? undefined : filter, q: sp.q, page: undefined, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "" && !(k === "page" && String(v) === "1")) params.set(k, String(v));
    const qs = params.toString();
    return qs ? `/admin/businesses?${qs}` : "/admin/businesses";
  };

  return (
    <>
      <PageHeader title={t("businessesTitle")} />
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav className="flex flex-wrap gap-1" aria-label={t("colStatus")}>
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={href({ status: f === "all" ? undefined : f })}
              aria-current={filter === f ? "page" : undefined}
              className={cn(
                "rounded-full border border-border px-3 py-1 text-sm",
                filter === f ? "border-forest bg-forest text-cream" : "bg-card hover:border-forest",
              )}
            >
              {f === "all" ? t("filterAll") : f === "changes" ? t("statChanges") : ts(f)}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2" action="/admin/businesses">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <Input name="q" defaultValue={sp.q} placeholder={t("searchPlaceholder")} className="w-56 bg-white" aria-label={t("searchPlaceholder")} />
          <Button type="submit" variant="outline">
            {t("searchButton")}
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colName")}</TableHead>
              <TableHead className="hidden md:table-cell">{t("colCategory")}</TableHead>
              <TableHead>{t("colCity")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead className="hidden lg:table-cell">{t("colSubmitted")}</TableHead>
              <TableHead className="text-right">{t("colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
            {(data ?? []).map((b) => (
              <TableRow key={b.id}>
                <TableCell className="max-w-[220px]">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{b.name}</span>
                    {b.is_verified && <BadgeCheck className="size-4 shrink-0 text-forest" aria-label="verified" />}
                    {b.is_featured && <Star className="size-4 shrink-0 text-gold-dark" aria-label="featured" />}
                    {b.pending_changes && <PencilLine className="size-4 shrink-0 text-amber-700" aria-label={t("statChanges")} />}
                  </div>
                  {b.is_demo && <span className="text-xs text-muted-foreground">demo</span>}
                </TableCell>
                <TableCell className="hidden md:table-cell">{b.category?.name}</TableCell>
                <TableCell>{b.city}</TableCell>
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">{format.dateTime(new Date(b.created_at), { dateStyle: "medium" })}</TableCell>
                <TableCell className="text-right">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/businesses/${b.id}`}>{t("review")}</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={href({ page: page - 1 })}>←</Link>
            </Button>
          )}
          <span className="px-2 py-1 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Button asChild variant="outline" size="sm">
              <Link href={href({ page: page + 1 })}>→</Link>
            </Button>
          )}
        </div>
      )}
    </>
  );
}
