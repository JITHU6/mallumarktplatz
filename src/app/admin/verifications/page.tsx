import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { reviewVerification } from "@/actions/admin";
import { ActionForm } from "@/components/admin/action-form";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminVerificationsPage() {
  await requireAdmin();
  const [t, format] = await Promise.all([getTranslations("admin"), getFormatter()]);
  const supabase = await createClient();
  const { data } = await supabase
    .from("business_verification_requests")
    .select(
      "*, business:businesses(id, name, city, website, email, phone), requester:profiles!business_verification_requests_requested_by_fkey(email, full_name)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  return (
    <>
      <PageHeader title={t("verificationsTitle")} description={t("verifyHint")} />
      {(data ?? []).length === 0 ? (
        <EmptyState icon={BadgeCheck} title={t("noResults")} />
      ) : (
        <ul className="space-y-3">
          {(data ?? []).map((v) => (
            <li key={v.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {v.business && (
                  <Link href={`/admin/businesses/${v.business.id}`} className="font-semibold text-forest hover:underline">
                    {v.business.name}
                  </Link>
                )}
                <span className="text-sm text-muted-foreground">{v.business?.city}</span>
                <span className="ml-auto text-xs text-muted-foreground">{format.dateTime(new Date(v.created_at), { dateStyle: "medium" })}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {v.requester?.full_name} · {v.requester?.email} · {v.business?.website ?? ""} {v.business?.phone ?? ""}
              </p>
              {v.message && <p className="mt-2 text-sm whitespace-pre-line">{v.message}</p>}
              <ActionForm action={reviewVerification} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="requestId" value={v.id} />
                <Input name="adminNotes" placeholder={t("adminNotes")} className="max-w-sm bg-white" />
                <SubmitButton size="sm" name="decision" value="approved">
                  {t("approveVerification")}
                </SubmitButton>
                <SubmitButton size="sm" variant="outline" name="decision" value="rejected">
                  {t("rejectVerification")}
                </SubmitButton>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
