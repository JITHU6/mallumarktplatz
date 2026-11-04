import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { directoryHref, type DirectoryParams } from "@/lib/directory-params";
import { cn } from "@/lib/utils";

function pageWindow(current: number, total: number): (number | "…")[] {
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

export async function DirectoryPagination({ params, totalPages }: { params: DirectoryParams; totalPages: number }) {
  const t = await getTranslations("common");
  const current = params.page;
  const linkClass =
    "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:border-forest hover:text-forest";

  return (
    <nav aria-label={t("pageOf", { page: current, total: totalPages })} className="flex flex-wrap items-center justify-center gap-2 pt-4">
      {current > 1 && (
        <Link href={directoryHref({ ...params, page: current - 1 })} className={linkClass} rel="prev">
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </Link>
      )}
      {pageWindow(current, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={directoryHref({ ...params, page: p })}
            aria-current={p === current ? "page" : undefined}
            className={cn(linkClass, p === current && "border-forest bg-forest text-cream hover:text-cream")}
          >
            {p}
          </Link>
        ),
      )}
      {current < totalPages && (
        <Link href={directoryHref({ ...params, page: current + 1 })} className={linkClass} rel="next">
          <span className="hidden sm:inline">{t("next")}</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </nav>
  );
}
