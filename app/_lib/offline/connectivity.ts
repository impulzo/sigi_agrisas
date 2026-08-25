"use client";

import { useEffect, useState } from "react";

const POLL_INTERVAL_MS = 30_000;

type Listener = (online: boolean) => void;

let listeners: Set<Listener> = new Set();
let currentOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
let started = false;

function notify(online: boolean): void {
  if (online === currentOnline) return;
  currentOnline = online;
  for (const listener of listeners) listener(online);
}

/** Called by `authFetch` (or any successful network call) as an opportunistic online signal. */
export function reportNetworkSuccess(): void {
  notify(true);
}

/** Called wherever a request fails with a network error, as an opportunistic offline signal. */
export function reportNetworkFailure(): void {
  notify(false);
}

async function pollConnectivity(): Promise<void> {
  if (typeof fetch === "undefined") return;
  try {
    const res = await fetch("/api/v1/auth/refresh", { method: "HEAD", cache: "no-store" }).catch(
      () => null
    );
    // Any response (even 4xx/5xx) proves the network path is up; only a thrown
    // exception (handled above as `null`) means genuinely offline.
    notify(res !== null);
  } catch {
    notify(false);
  }
}

function startGlobalListeners(): void {
  if (started || typeof window === "undefined") return;
  started = true;

  window.addEventListener("online", () => notify(true));
  window.addEventListener("offline", () => notify(false));

  setInterval(() => {
    void pollConnectivity();
  }, POLL_INTERVAL_MS);
}

export function isOnline(): boolean {
  startGlobalListeners();
  return currentOnline;
}

export function subscribeConnectivity(listener: Listener): () => void {
  startGlobalListeners();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() => isOnline());

  useEffect(() => {
    setOnline(isOnline());
    return subscribeConnectivity(setOnline);
  }, []);

  return online;
}

/** Test-only: resets module-level connectivity state between test cases. */
export function resetConnectivityForTests(initialOnline = true): void {
  listeners = new Set();
  currentOnline = initialOnline;
  started = false;
}
