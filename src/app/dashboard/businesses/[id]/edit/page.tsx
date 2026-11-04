import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { Clock, Info, TriangleAlert } from "lucide-react";
import { StatusBadge } from "@/components/business/badges";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { BusinessForm } from "@/components/forms/business-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { requireUser } from "@/lib/auth";
import { businessToFormValues } from "@/lib/business-form-values";
import { getBusinessForEdit } from "@/lib/data/businesses";
import { getBusinessFormOptions } from "@/lib/data/form-options";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export default async function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const user = await requireUser(`/dashboard/businesses/${id}/edit`);
  const supabase = await createClient();
  const { data: canManage } = await supabase.rpc("can_manage_business", { p_business_id: id });
  if (!canManage) notFound();
  const business = await getBusinessForEdit(id);
  if (!business) notFound();

  const [t, tf, format, { categoryOptions, cityNames }] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("form"),
    getFormatter(),
    getBusinessFormOptions(),
  ]);
  const published = business.status === "approved" || business.status === "suspended";

  const notices = (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <StatusBadge status={business.status} />
      </div>
      {published && !user.isAdmin && (
        <Alert>
          <Info />
          <AlertDescription>{tf("approvedEditNotice")}</AlertDescription>
        </Alert>
      )}
      {business.pending_changes && business.pending_changes_submitted_at && (
        <Alert className="border-amber-300 bg-amber-50">
          <Clock />
          <AlertDescription className="text-amber-900">
            {tf("pendingChangesNotice", {
              date: format.dateTime(new Date(business.pending_changes_submitted_at), { dateStyle: "medium" }),
            })}
          </AlertDescription>
        </Alert>
      )}
      {business.status === "rejected" && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertDescription>{tf("rejectedNotice", { reason: business.rejection_reason ?? "–" })}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  return (
    <>
      <PageHeader title={t("editBusinessTitle", { name: business.name })} />
      <BusinessForm
        mode="edit"
        businessId={business.id}
        status={business.status}
        isAdmin={user.isAdmin}
        userId={user.id}
        categories={categoryOptions}
        cityNames={cityNames}
        defaultValues={businessToFormValues(business)}
        notices={notices}
      />
    </>
  );
}
