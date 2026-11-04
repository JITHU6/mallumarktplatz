import { useTranslations } from "next-intl";
import { BadgeCheck, FlaskConical, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { BusinessStatus } from "@/lib/supabase/database.types";

export function VerifiedBadge({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn("cursor-help gap-1 bg-forest text-cream", className)} tabIndex={0}>
          <BadgeCheck /> {t("verified")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{t("verifiedHint")}</TooltipContent>
    </Tooltip>
  );
}

export function FeaturedBadge({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <Badge className={cn("gap-1 bg-gold text-charcoal", className)}>
      <Star /> {t("featured")}
    </Badge>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  const t = useTranslations("common");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={cn("cursor-help gap-1 border-dashed bg-white text-muted-foreground", className)} tabIndex={0}>
          <FlaskConical /> {t("demoListing")}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{t("demoListingHint")}</TooltipContent>
    </Tooltip>
  );
}

const statusStyles: Record<BusinessStatus, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
  suspended: "bg-zinc-200 text-zinc-800",
};

export function StatusBadge({ status, className }: { status: BusinessStatus; className?: string }) {
  const t = useTranslations("status");
  return <Badge className={cn(statusStyles[status], className)}>{t(status)}</Badge>;
}
