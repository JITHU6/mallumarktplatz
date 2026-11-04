import { getTranslations } from "next-intl/server";
import { Clock } from "lucide-react";
import { isOpenAt, trimSeconds, zonedDayAndTime, type DayHours } from "@/lib/opening-hours";
import { cn } from "@/lib/utils";

type Row = { day_of_week: number; opens_at: string | null; closes_at: string | null; is_closed: boolean };

export async function OpeningHoursTable({ hours }: { hours: Row[] }) {
  const t = await getTranslations("business");
  if (hours.length === 0) return <p className="text-sm text-muted-foreground">{t("noHours")}</p>;

  const normalized: DayHours[] = hours.map((h) => ({
    day: h.day_of_week as DayHours["day"],
    closed: h.is_closed,
    opens: trimSeconds(h.opens_at),
    closes: trimSeconds(h.closes_at),
  }));
  const now = new Date();
  const open = isOpenAt(normalized, now);
  const today = zonedDayAndTime(now).day;

  return (
    <div className="space-y-3">
      {open !== null && (
        <p
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            open ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-700",
          )}
        >
          <Clock className="size-3.5" aria-hidden="true" />
          {open ? t("openNow") : t("closedNow")}
        </p>
      )}
      <table className="w-full text-sm">
        <caption className="sr-only">{t("openingHours")}</caption>
        <tbody>
          {normalized.map((h) => (
            <tr key={h.day} className={cn("border-b border-border/60 last:border-0", h.day === today && "font-semibold text-forest")}>
              <th scope="row" className="py-2 text-left font-medium">
                {t(`days.${h.day}`)}
              </th>
              <td className="py-2 text-right tabular-nums">
                {h.closed ? t("closed") : `${h.opens} – ${h.closes}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
