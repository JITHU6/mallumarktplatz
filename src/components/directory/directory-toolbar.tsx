"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LayoutGrid, List, Map } from "lucide-react";
import { NativeSelect } from "@/components/forms/native-select";
import { directoryHref, type DirectoryParams, type SortOption } from "@/lib/directory-params";
import { cn } from "@/lib/utils";

export function DirectoryToolbar({ params }: { params: DirectoryParams }) {
  const t = useTranslations("directory");
  const router = useRouter();

  const views = [
    { value: "grid", label: t("viewGrid"), Icon: LayoutGrid },
    { value: "list", label: t("viewList"), Icon: List },
    { value: "map", label: t("viewMap"), Icon: Map },
  ] as const;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="sort" className="text-sm whitespace-nowrap text-muted-foreground">
          {t("sort")}
        </label>
        <NativeSelect
          id="sort"
          value={params.sort}
          className="w-44"
          onChange={(e) =>
            router.push(directoryHref({ ...params, sort: e.target.value as SortOption, page: 1 }), { scroll: false })
          }
        >
          <option value="relevance">{t("sortRelevance")}</option>
          <option value="newest">{t("sortNewest")}</option>
          <option value="name">{t("sortName")}</option>
        </NativeSelect>
      </div>
      <nav aria-label={t("view")} className="inline-flex rounded-lg border border-border bg-card p-1">
        {views.map(({ value, label, Icon }) => {
          const active = params.view === value;
          return (
            <Link
              key={value}
              href={directoryHref({ ...params, view: value, page: 1 })}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-forest",
                active && "bg-forest text-cream hover:text-cream",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sr-only sm:hidden">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
