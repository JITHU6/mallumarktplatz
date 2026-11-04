"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DayValue = { day: number; closed?: string; opens?: string; closes?: string };

export function HoursEditor({ defaultHours, errors }: { defaultHours: DayValue[]; errors: Record<string, string> }) {
  const t = useTranslations("form");
  const tb = useTranslations("business");
  const tv = useTranslations("validation");
  const [hours, setHours] = useState(
    defaultHours.map((h) => ({ day: h.day, closed: h.closed === "on" || h.closed === "true", opens: h.opens ?? "", closes: h.closes ?? "" })),
  );

  const update = (day: number, patch: Partial<(typeof hours)[number]>) =>
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  const copyMonday = () => {
    const monday = hours.find((h) => h.day === 1);
    if (!monday) return;
    setHours((prev) => prev.map((h) => (h.day === 7 ? h : { ...h, closed: monday.closed, opens: monday.opens, closes: monday.closes })));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("hoursHint")}</p>
        <Button type="button" variant="outline" size="sm" onClick={copyMonday}>
          <Copy /> {t("copyToAll")}
        </Button>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border bg-white">
        {hours.map((h) => {
          const error = errors[`hours.${h.day - 1}.opens`];
          return (
            <li key={h.day} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 p-3 sm:grid-cols-[130px_auto_1fr]">
              <input type="hidden" name={`hours.${h.day}.closed`} value={h.closed ? "on" : ""} />
              <span className="text-sm font-medium">{tb(`days.${h.day as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)}</span>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={h.closed}
                  onChange={(e) => update(h.day, { closed: e.target.checked })}
                  className="size-4 accent-forest"
                />
                {t("closed")}
              </label>
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <Input
                  type="time"
                  name={`hours.${h.day}.opens`}
                  value={h.closed ? "" : h.opens}
                  disabled={h.closed}
                  onChange={(e) => update(h.day, { opens: e.target.value })}
                  aria-label={`${tb(`days.${h.day as 1}`)} – ${t("opens")}`}
                  aria-invalid={error ? true : undefined}
                  className="w-full bg-white"
                />
                <span aria-hidden="true">–</span>
                <Input
                  type="time"
                  name={`hours.${h.day}.closes`}
                  value={h.closed ? "" : h.closes}
                  disabled={h.closed}
                  onChange={(e) => update(h.day, { closes: e.target.value })}
                  aria-label={`${tb(`days.${h.day as 1}`)} – ${t("closes")}`}
                  aria-invalid={error ? true : undefined}
                  className="w-full bg-white"
                />
              </div>
              {error && (
                <p className="col-span-full text-xs font-medium text-destructive" role="alert">
                  {tv(error as "incompleteHours")}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
