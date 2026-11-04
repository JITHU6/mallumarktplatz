import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("resetTitle"), robots: { index: false } };
}

/** Reached via the recovery email link, which signs the user in first. */
export default async function ResetPasswordPage() {
  const t = await getTranslations("auth");
  const user = await getCurrentUser();
  return (
    <AuthCard title={t("resetTitle")}>
      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>{t("errors.sessionExpired")}</AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link href="/forgot-password">{t("forgotSubmit")}</Link>
          </Button>
        </div>
      )}
    </AuthCard>
  );
}
