import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireAdmin } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const t = await getTranslations("admin");
  const nav = [
    { href: "/admin", label: t("navOverview"), icon: "overview" as const, exact: true },
    { href: "/admin/businesses", label: t("navBusinesses"), icon: "adminBusinesses" as const },
    { href: "/admin/verifications", label: t("navVerifications"), icon: "verifications" as const },
    { href: "/admin/reports", label: t("navReports"), icon: "reports" as const },
    { href: "/admin/users", label: t("navUsers"), icon: "users" as const },
    { href: "/admin/categories", label: t("navCategories"), icon: "categories" as const },
    { href: "/admin/cities", label: t("navCities"), icon: "cities" as const },
  ];
  return (
    <DashboardShell title={t("title")} nav={nav} navLabel={t("title")}>
      {children}
    </DashboardShell>
  );
}
