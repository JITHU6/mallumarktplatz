import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { BadgeCheck, Building2, CircleCheck, Clock, Flag, PencilLine, Users } from "lucide-react";
import { StatusBadge } from "@/components/business/badges";
import { PageHeader, StatCard } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [t, format] = await Promise.all([getTranslations("admin"), getFormatter()]);
  const supabase = await createClient();
  const count = { count: "exact" as const, head: true };

  const [total, pending, approved, users, reports, verifications, changes, recent] = await Promise.all([
    supabase.from("businesses").select("id", count),
    supabase.from("businesses").select("id", count).eq("status", "pending"),
    supabase.from("businesses").select("id", count).eq("status", "approved"),
    supabase.from("profiles").select("id", count),
    supabase.from("business_reports").select("id", count).eq("status", "open"),
    supabase.from("business_verification_requests").select("id", count).eq("status", "pending"),
    supabase.from("businesses").select("id", count).not("pending_changes", "is", null),
    supabase
      .from("businesses")
      .select("id, name, city, status, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const stats = [
    { label: t("statTotal"), value: total.count ?? 0, icon: Building2, href: "/admin/businesses" },
    { label: t("statPending"), value: pending.count ?? 0, icon: Clock, href: "/admin/businesses?status=pending" },
    { label: t("statApproved"), value: approved.count ?? 0, icon: CircleCheck, href: "/admin/businesses?status=approved" },
    { label: t("statUsers"), value: users.count ?? 0, icon: Users, href: "/admin/users" },
    { label: t("statChanges"), value: changes.count ?? 0, icon: PencilLine, href: "/admin/businesses?status=changes" },
    { label: t("statVerifications"), value: verifications.count ?? 0, icon: BadgeCheck, href: "/admin/verifications" },
    { label: t("statReports"), value: reports.count ?? 0, icon: Flag, href: "/admin/reports" },
  ];

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
            <StatCard label={s.label} value={s.value} icon={s.icon} />
          </Link>
        ))}
      </div>
      <section className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-forest">{t("recentSubmissions")}</h3>
        {(recent.data ?? []).length === 0 ? (
          <EmptyState icon={Building2} title={t("noSubmissions")} />
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card shadow-sm">
            {(recent.data ?? []).map((b) => (
              <li key={b.id}>
                <Link href={`/admin/businesses/${b.id}`} className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-muted/50">
                  <span className="font-medium text-charcoal">{b.name}</span>
                  <span className="text-sm text-muted-foreground">{b.city}</span>
                  <StatusBadge status={b.status} />
                  <span className="ml-auto text-xs text-muted-foreground">
                    {format.dateTime(new Date(b.created_at), { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
