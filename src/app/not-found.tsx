import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("common");
  return (
    <div className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-forest">
        <Compass className="size-7" aria-hidden="true" />
      </span>
      <h1 className="text-3xl font-bold text-forest">{t("notFoundTitle")}</h1>
      <p className="max-w-md text-muted-foreground">{t("notFoundDescription")}</p>
      <Button asChild>
        <Link href="/">{t("goHome")}</Link>
      </Button>
    </div>
  );
}
