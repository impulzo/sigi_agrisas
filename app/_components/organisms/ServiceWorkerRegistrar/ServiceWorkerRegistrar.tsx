"use client";

import { useEffect } from "react";

/** Registers `public/sw.js` for PWA installability + offline app shell (see offline-sync). */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Best-effort: absence of a service worker degrades to "no offline app
      // shell", not a broken app — every other offline-sync capability
      // (IndexedDB cache, outbox, sync engine) works independently of this.
    });
  }, []);

  return null;
}
