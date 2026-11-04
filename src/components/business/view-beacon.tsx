"use client";

import { useEffect } from "react";
import { recordView } from "@/actions/public";

/** Counts one view per browser session per business (no cookies, no personal data). */
export function ViewBeacon({ businessId }: { businessId: string }) {
  useEffect(() => {
    const key = `mm:viewed:${businessId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable – still count once per page load.
    }
    void recordView(businessId);
  }, [businessId]);
  return null;
}
