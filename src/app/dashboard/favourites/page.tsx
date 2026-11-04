import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Heart } from "lucide-react";
import { BusinessListItem } from "@/components/business/business-card";
import { PageHeader } from "@/components/dashboard/dashboard-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth";
import { CARD_SELECT } from "@/lib/data/businesses";
import { createClient } from "@/lib/supabase/server";

export default async function FavouritesPage() {
  const user = await requireUser("/dashboard/favourites");
  const t = await getTranslations("dashboard");
  const supabase = await createClient();
  const { data } = await supabase
    .from("favourites")
    .select(`created_at, business:businesses ( ${CARD_SELECT} )`)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  // Businesses that were unpublished meanwhile are hidden by RLS (business = null).
  const businesses = (data ?? []).map((f) => f.business).filter((b) => b !== null && b.status === "approved");

  return (
    <>
      <PageHeader title={t("favouritesTitle")} />
      {businesses.length === 0 ? (
        <EmptyState icon={Heart} title={t("favouritesEmpty")}>
          <Button asChild>
            <Link href="/businesses">{t("favouritesBrowse")}</Link>
          </Button>
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {businesses.map((b) => (
            <li key={b!.id}>
              <BusinessListItem business={b!} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
