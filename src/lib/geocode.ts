import "server-only";
import { getCities, resolveCitySlug } from "@/lib/data/taxonomy";

export type Coordinates = { latitude: number; longitude: number; precision: "address" | "city" };

/**
 * Geocodes an address with the Mapbox Geocoding API (if a token is configured)
 * and falls back to the coordinates of a known city.
 */
export async function geocodeAddress(input: {
  addressLine?: string | null;
  postalCode: string;
  city: string;
  countryCode?: string;
}): Promise<Coordinates | null> {
  const token = process.env.MAPBOX_GEOCODING_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (token) {
    try {
      const query = [input.addressLine, `${input.postalCode} ${input.city}`].filter(Boolean).join(", ");
      const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
      url.searchParams.set("q", query);
      url.searchParams.set("country", (input.countryCode ?? "DE").toLowerCase());
      url.searchParams.set("limit", "1");
      url.searchParams.set("access_token", token);
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const json = (await res.json()) as {
          features?: { geometry?: { coordinates?: [number, number] } }[];
        };
        const coords = json.features?.[0]?.geometry?.coordinates;
        if (coords) return { longitude: coords[0], latitude: coords[1], precision: "address" };
      }
    } catch {
      // Fall through to the city fallback.
    }
  }

  const slug = await resolveCitySlug(input.city);
  if (!slug) return null;
  const city = (await getCities()).find((c) => c.slug === slug);
  if (city?.latitude == null || city.longitude == null) return null;
  return { latitude: city.latitude, longitude: city.longitude, precision: "city" };
}
