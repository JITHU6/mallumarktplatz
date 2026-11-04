import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireUser("/dashboard");
  const t = await getTranslations("dashboard");
  const nav = [
    { href: "/dashboard", label: t("navOverview"), icon: "overview" as const, exact: true },
    { href: "/dashboard/businesses", label: t("navBusinesses"), icon: "businesses" as const },
    { href: "/dashboard/favourites", label: t("navFavourites"), icon: "favourites" as const },
    { href: "/dashboard/profile", label: t("navProfile"), icon: "profile" as const },
    { href: "/dashboard/settings", label: t("navSettings"), icon: "settings" as const },
  ];
  return (
    <DashboardShell title={t("title")} nav={nav} navLabel={t("title")}>
      {children}
    </DashboardShell>
  );
}
