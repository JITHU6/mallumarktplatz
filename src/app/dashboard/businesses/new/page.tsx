import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { BusinessForm } from "@/components/forms/business-form";
import { requireUser } from "@/lib/auth";
import { EMPTY_FORM_VALUES } from "@/lib/business-form-values";
import { getBusinessFormOptions } from "@/lib/data/form-options";

export default async function NewBusinessPage() {
  const user = await requireUser("/dashboard/businesses/new");
  const t = await getTranslations("dashboard");
  const tr = await getTranslations("registerBusiness");
  const { categoryOptions, cityNames } = await getBusinessFormOptions();

  return (
    <>
      <PageHeader title={t("newBusinessTitle")} description={tr("subtitle")} />
      <BusinessForm
        mode="create"
        userId={user.id}
        isAdmin={user.isAdmin}
        categories={categoryOptions}
        cityNames={cityNames}
        defaultValues={{
          ...EMPTY_FORM_VALUES,
          ownerName: user.profile?.full_name ?? "",
          email: user.email ?? "",
        }}
      />
    </>
  );
}
