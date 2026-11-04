import { describe, expect, it } from "vitest";
import de from "../messages/de.json";
import en from "../messages/en.json";
import ml from "../messages/ml.json";

function keys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const enKeys = new Set(keys(en));

describe("translation catalogues", () => {
  it.each([
    ["de", de],
    ["ml", ml],
  ])("%s only contains keys that exist in English", (_, messages) => {
    const unknown = keys(messages as Record<string, unknown>).filter((k) => !enKeys.has(k));
    expect(unknown).toEqual([]);
  });

  it("German covers every user-facing key (admin UI may fall back to English)", () => {
    const deKeys = new Set(keys(de));
    const missing = [...enKeys].filter(
      (k) => !deKeys.has(k) && !k.startsWith("admin.") && k !== "common.appName",
    );
    expect(missing).toEqual([]);
  });

  it("keeps ICU placeholders intact in translations", () => {
    const flatEn = Object.fromEntries(keys(en).map((k) => [k, get(en, k)]));
    for (const messages of [de, ml]) {
      for (const k of keys(messages as Record<string, unknown>)) {
        const placeholders = (s: string) => (s.match(/\{(\w+)[,}]/g) ?? []).sort();
        expect(placeholders(get(messages, k)), k).toEqual(placeholders(flatEn[k]));
      }
    }
  });
});

function get(obj: unknown, path: string): string {
  return path.split(".").reduce<unknown>((o, p) => (o as Record<string, unknown>)[p], obj) as string;
}
