import { getTranslations } from "next-intl/server";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { ChangePasswordForm, DeleteAccountForm } from "@/components/dashboard/settings-forms";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";

export default async function SettingsPage() {
  await requireUser("/dashboard/settings");
  const t = await getTranslations("dashboard");
  return (
    <>
      <PageHeader title={t("settingsTitle")} />
      <div className="max-w-2xl space-y-6">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-forest">{t("changePassword")}</h3>
          <ChangePasswordForm />
        </section>
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold text-forest">{t("dataExport")}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{t("dataExportText")}</p>
          <Button asChild variant="outline">
            <a href="/dashboard/export" download>
              <Download /> {t("dataExportButton")}
            </a>
          </Button>
        </section>
        <section className="rounded-2xl border border-destructive/30 bg-card p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold text-destructive">{t("deleteAccount")}</h3>
          <p className="mb-4 text-sm text-muted-foreground">{t("deleteAccountText")}</p>
          <DeleteAccountForm />
        </section>
      </div>
    </>
  );
}
