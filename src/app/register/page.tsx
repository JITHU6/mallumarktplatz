import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/auth-forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/validation/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("registerTitle"), robots: { index: false } };
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNextPath(next);
  if (await getCurrentUser()) redirect(target);
  const t = await getTranslations("auth");
  return (
    <AuthCard title={t("registerTitle")} subtitle={t("registerSubtitle")}>
      <RegisterForm next={target} />
    </AuthCard>
  );
}
