"use client";

import { useEffect, useRef } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export type MapBusiness = {
  id: string;
  slug: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
};

const GERMANY_CENTER: [number, number] = [10.4515, 51.1657];

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Interactive Mapbox map. mapbox-gl is loaded lazily on the client only. */
export function BusinessMap({
  businesses,
  className,
  zoom,
  interactive = true,
}: {
  businesses: MapBusiness[];
  className?: string;
  zoom?: number;
  interactive?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current || !env.mapboxToken) return;
    let map: import("mapbox-gl").Map | undefined;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !container.current) return;
      mapboxgl.accessToken = env.mapboxToken;
      map = new mapboxgl.Map({
        container: container.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: businesses.length === 1 ? [businesses[0].longitude, businesses[0].latitude] : GERMANY_CENTER,
        zoom: zoom ?? (businesses.length === 1 ? 14 : 5),
        interactive,
        cooperativeGestures: true,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      const bounds = new mapboxgl.LngLatBounds();
      for (const b of businesses) {
        const el = document.createElement("div");
        el.className = "size-4 rounded-full border-2 border-white bg-[#173E35] shadow-md ring-2 ring-[#D6AE65]";
        const popup =
          businesses.length > 1
            ? new mapboxgl.Popup({ offset: 12 }).setHTML(
                `<a href="/business/${encodeURIComponent(b.slug)}" style="font-weight:600;color:#173E35">${escapeHtml(b.name)}</a><br/><span style="color:#5b625e">${escapeHtml(b.city)}</span>`,
              )
            : undefined;
        const marker = new mapboxgl.Marker({ element: el }).setLngLat([b.longitude, b.latitude]);
        if (popup) marker.setPopup(popup);
        marker.addTo(map);
        bounds.extend([b.longitude, b.latitude]);
      }
      if (businesses.length > 1) map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [businesses, zoom, interactive]);

  return (
    <div
      ref={container}
      className={cn("w-full overflow-hidden rounded-2xl border border-border bg-muted", className)}
      role="region"
      aria-label="Map"
    />
  );
}
