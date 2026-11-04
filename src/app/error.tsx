"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common");
  useEffect(() => {
    // Server errors are logged with trace_id + digest by onRequestError (src/instrumentation.ts).
    console.error(error);
  }, [error]);
  return (
    <div className="container-page flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-red-100 text-red-800">
        <TriangleAlert className="size-7" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-bold text-forest">{t("errorTitle")}</h1>
      <p className="max-w-md text-muted-foreground">{t("errorDescription")}</p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">{t("errorReference", { reference: error.digest })}</p>
      )}
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}
