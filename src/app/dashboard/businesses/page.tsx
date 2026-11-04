import Image from "next/image";
import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { BadgeCheck, CircleCheck, Clock, Eye, Pencil, Plus, Store } from "lucide-react";
import { StatusBadge } from "@/components/business/badges";
import { CategoryIcon } from "@/components/business/category-icon";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { DeleteBusinessButton, RequestVerificationButton } from "@/components/dashboard/business-row-actions";
import { EmptyState } from "@/components/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getManagedBusinesses, getViewsLast30Days } from "@/lib/data/dashboard";
import { mediaUrl } from "@/lib/storage";

export default async function MyBusinessesPage({ searchParams }: { searchParams: Promise<{ submitted?: string }> }) {
  const user = await requireUser("/dashboard/businesses");
  const { submitted } = await searchParams;
  const [t, tf, tc, format] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("form"),
    getTranslations("common"),
    getFormatter(),
  ]);
  const businesses = await getManagedBusinesses(user.id);
  const views = await getViewsLast30Days(businesses.map((b) => b.id));

  return (
    <>
      <PageHeader
        title={t("businessesTitle")}
        actions={
          <Button asChild>
            <Link href="/dashboard/businesses/new">
              <Plus /> {t("addBusiness")}
            </Link>
          </Button>
        }
      />
      {submitted && (
        <Alert className="mb-6 border-emerald-300 bg-emerald-50" role="status">
          <CircleCheck />
          <AlertDescription className="text-emerald-900">{tf("createSuccess")}</AlertDescription>
        </Alert>
      )}
      {businesses.length === 0 ? (
        <EmptyState icon={Store} title={t("businessesEmpty")}>
          <Button asChild>
            <Link href="/dashboard/businesses/new">
              <Plus /> {t("addBusiness")}
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-4">
          {businesses.map((b) => {
            const logo = mediaUrl(b.logo_path);
            const latestVerification = [...(b.verification ?? [])].sort((x, y) => y.created_at.localeCompare(x.created_at))[0];
            return (
              <li key={b.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary text-forest">
                    {logo ? <Image src={logo} alt="" fill sizes="64px" className="object-cover" /> : <CategoryIcon icon={b.category?.icon} className="size-7" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-charcoal">{b.name}</h3>
                      <StatusBadge status={b.status} />
                      {b.is_verified && (
                        <Badge className="bg-forest text-cream">
                          <BadgeCheck /> {tc("verified")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {b.category?.name} · {b.city}
                    </p>
                    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Eye className="size-4" aria-hidden="true" /> {t("views30", { count: views.get(b.id) ?? 0 })}
                    </p>
                    {b.status === "rejected" && b.rejection_reason && (
                      <p className="rounded-lg bg-red-50 p-2 text-sm text-red-900">{t("rejectedReason", { reason: b.rejection_reason })}</p>
                    )}
                    {b.pending_changes && b.pending_changes_submitted_at && (
                      <p className="flex items-center gap-1.5 text-sm text-amber-800">
                        <Clock className="size-4" aria-hidden="true" />
                        {tf("pendingChangesNotice", { date: format.dateTime(new Date(b.pending_changes_submitted_at), { dateStyle: "medium" }) })}
                      </p>
                    )}
                    {latestVerification?.status === "rejected" && !b.is_verified && (
                      <p className="text-sm text-muted-foreground">{t("verificationRejected")}</p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/business/${b.slug}`}>
                      <Eye /> {t("viewListing")}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/dashboard/businesses/${b.id}/edit`}>
                      <Pencil /> {t("editListing")}
                    </Link>
                  </Button>
                  {b.status === "approved" && !b.is_verified && (
                    latestVerification?.status === "pending" ? (
                      <Badge variant="outline" className="h-7">
                        <Clock /> {t("verificationPending")}
                      </Badge>
                    ) : (
                      <RequestVerificationButton businessId={b.id} />
                    )
                  )}
                  <div className="ml-auto">
                    <DeleteBusinessButton businessId={b.id} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
