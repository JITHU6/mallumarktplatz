"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleFavourite } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FavouriteButton({
  businessId,
  initialSaved,
  isLoggedIn,
  returnTo,
}: {
  businessId: string;
  initialSaved: boolean;
  isLoggedIn: boolean;
  returnTo: string;
}) {
  const t = useTranslations("business");
  const tf = useTranslations("favourites");
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  if (!isLoggedIn) {
    return (
      <Button asChild variant="outline" size="lg" title={t("loginToSave")}>
        <Link href={`/login?next=${encodeURIComponent(returnTo)}`}>
          <Heart /> {t("saveFavourite")}
        </Link>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="lg"
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleFavourite(businessId);
          if (!result.ok) {
            toast.error(tf("error"));
            return;
          }
          setSaved(Boolean(result.saved));
          toast.success(result.saved ? tf("added") : tf("removed"));
        })
      }
    >
      <Heart className={cn(saved && "fill-red-500 text-red-500")} />
      {saved ? t("savedFavourite") : t("saveFavourite")}
    </Button>
  );
}
