import { getTranslations } from "next-intl/server";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export async function SetupNotice() {
  const t = await getTranslations("common");
  return (
    <div className="container-page py-16">
      <Alert>
        <TriangleAlert />
        <AlertTitle>{t("setupRequiredTitle")}</AlertTitle>
        <AlertDescription>{t("setupRequiredDescription")}</AlertDescription>
      </Alert>
    </div>
  );
}
