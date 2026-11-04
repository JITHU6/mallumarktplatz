import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Flag } from "lucide-react";
import { updateReport } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const showAll = status === "all";
  const [t, tr, format] = await Promise.all([getTranslations("admin"), getTranslations("report"), getFormatter()]);
  const supabase = await createClient();
  let query = supabase
    .from("business_reports")
    .select("*, business:businesses(id, name, slug)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (!showAll) query = query.eq("status", "open");
  const { data } = await query;

  return (
    <>
      <PageHeader title={t("reportsTitle")} />
      <nav className="mb-4 flex gap-1">
        {[
          { href: "/admin/reports", label: t("filterOpen"), active: !showAll },
          { href: "/admin/reports?status=all", label: t("filterAll"), active: showAll },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn("rounded-full border px-3 py-1 text-sm", l.active ? "border-forest bg-forest text-cream" : "bg-card")}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      {(data ?? []).length === 0 ? (
        <EmptyState icon={Flag} title={t("noResults")} />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-900">{tr(`reasons.${r.reason}`)}</span>
                <span className="text-muted-foreground">{r.status}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {format.dateTime(new Date(r.created_at), { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <p className="mt-2 font-medium">
                {r.business ? (
                  <Link href={`/admin/businesses/${r.business.id}`} className="text-forest hover:underline">
                    {r.business.name}
                  </Link>
                ) : (
                  "—"
                )}
              </p>
              {r.details && <p className="mt-1 text-sm whitespace-pre-line">{r.details}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {t("reportBy")}: {r.reporter_email ?? (r.reporter_id ? r.reporter_id : t("anonymous"))}
              </p>
              <ActionForm action={updateReport} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="reportId" value={r.id} />
                <Input name="adminNotes" defaultValue={r.admin_notes ?? ""} placeholder={t("adminNotes")} className="max-w-sm bg-white" />
                <SubmitButton size="sm" name="status" value="resolved">
                  {t("resolve")}
                </SubmitButton>
                <SubmitButton size="sm" variant="outline" name="status" value="dismissed">
                  {t("dismiss")}
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
