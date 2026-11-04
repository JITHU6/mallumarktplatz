import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Eye, Heart, Plus, Search, Store } from "lucide-react";
import { PageHeader, StatCard } from "@/components/dashboard/dashboard-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { getManagedBusinesses, getViewsLast30Days } from "@/lib/data/dashboard";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const user = await requireUser("/dashboard");
  const { welcome } = await searchParams;
  const t = await getTranslations("dashboard");
  const tn = await getTranslations("nav");
  const ta = await getTranslations("auth");
  const supabase = await createClient();

  const [businesses, { count: favouriteCount }] = await Promise.all([
    getManagedBusinesses(user.id),
    supabase.from("favourites").select("business_id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  const views = await getViewsLast30Days(businesses.map((b) => b.id));
  const totalViews = [...views.values()].reduce((a, b) => a + b, 0);
  const name = user.profile?.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader title={name ? t("welcome", { name }) : t("welcomeFallback")} description={t("overviewText")} />
      {welcome && (
        <Alert className="mb-6 border-emerald-300 bg-emerald-50">
          <AlertDescription className="text-emerald-900">{ta("emailConfirmed")}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label={t("statBusinesses")} value={businesses.length} icon={Store} />
        <StatCard label={t("statFavourites")} value={favouriteCount ?? 0} icon={Heart} />
        <StatCard label={t("statViews")} value={totalViews} icon={Eye} />
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/dashboard/businesses/new">
            <Plus /> {tn("addBusiness")}
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/businesses">
            <Search /> {tn("explore")}
          </Link>
        </Button>
      </div>
    </>
  );
}
