export const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
export type IsoDay = (typeof ISO_DAYS)[number];

export type DayHours = {
  day: IsoDay;
  closed: boolean;
  opens: string | null; // "HH:MM"
  closes: string | null; // "HH:MM"
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTime(value: string): boolean {
  return TIME.test(value);
}

/** "09:00:00" -> "09:00" */
export function trimSeconds(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

function toMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

/** Returns the ISO weekday and "HH:MM" for a date in the given time zone. */
export function zonedDayAndTime(date: Date, timeZone = "Europe/Berlin"): { day: IsoDay; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";
  const map: Record<string, IsoDay> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return { day: map[weekday] ?? 1, time: `${hour}:${minute}` };
}

/**
 * Whether the business is open at `now`. Supports closing times after midnight
 * (e.g. 18:00–02:00). Returns null when no hours are known.
 */
export function isOpenAt(hours: DayHours[], now: Date, timeZone = "Europe/Berlin"): boolean | null {
  if (hours.length === 0) return null;
  const { day, time } = zonedDayAndTime(now, timeZone);
  const minutes = toMinutes(time);
  const previousDay = (day === 1 ? 7 : day - 1) as IsoDay;

  for (const h of hours) {
    if (h.closed || !h.opens || !h.closes) continue;
    const open = toMinutes(h.opens);
    const close = toMinutes(h.closes);
    const overnight = close <= open;
    if (h.day === day && (overnight ? minutes >= open : minutes >= open && minutes < close)) return true;
    if (overnight && h.day === previousDay && minutes < close) return true;
  }
  return false;
}
