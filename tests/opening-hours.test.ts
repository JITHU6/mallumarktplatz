import { describe, expect, it } from "vitest";
import { isOpenAt, zonedDayAndTime, type DayHours } from "@/lib/opening-hours";

// 2026-11-02 is a Monday. 11:00 UTC = 12:00 in Berlin (CET).
const mondayNoonBerlin = new Date("2026-11-02T11:00:00Z");
const tuesday0100Berlin = new Date("2026-11-03T00:00:00Z");

describe("opening hours", () => {
  it("resolves day and time in Europe/Berlin", () => {
    expect(zonedDayAndTime(mondayNoonBerlin)).toEqual({ day: 1, time: "12:00" });
  });

  it("returns null when no hours are known", () => {
    expect(isOpenAt([], mondayNoonBerlin)).toBeNull();
  });

  it("detects open and closed times", () => {
    const hours: DayHours[] = [{ day: 1, closed: false, opens: "09:00", closes: "18:00" }];
    expect(isOpenAt(hours, mondayNoonBerlin)).toBe(true);
    expect(isOpenAt([{ day: 1, closed: false, opens: "13:00", closes: "18:00" }], mondayNoonBerlin)).toBe(false);
    expect(isOpenAt([{ day: 1, closed: true, opens: null, closes: null }], mondayNoonBerlin)).toBe(false);
  });

  it("handles opening hours past midnight", () => {
    const hours: DayHours[] = [{ day: 1, closed: false, opens: "18:00", closes: "02:00" }];
    expect(isOpenAt(hours, tuesday0100Berlin)).toBe(true);
  });
});
