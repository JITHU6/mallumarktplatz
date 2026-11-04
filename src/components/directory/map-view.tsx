import { getTranslations } from "next-intl/server";
import { MapPinOff } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { env } from "@/lib/env";
import { BusinessMap, type MapBusiness } from "./business-map";

export async function MapView({ businesses, total }: { businesses: MapBusiness[]; total: number }) {
  const t = await getTranslations("directory");
  if (!env.mapboxToken) {
    return <EmptyState icon={MapPinOff} title={t("viewMap")} description={t("mapNotConfigured")} />;
  }
  if (businesses.length === 0) {
    return <EmptyState icon={MapPinOff} title={t("emptyTitle")} description={t("mapNoLocations")} />;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        {t("mapShowing", { count: total })} {t("mapApproximate")}
      </p>
      <BusinessMap businesses={businesses} className="h-[60vh] min-h-[420px]" />
    </div>
  );
}
