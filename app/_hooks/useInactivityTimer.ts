"use client";

import { useEffect, useRef } from "react";

const THROTTLE_MS = 2_000;
const ACTIVITY_KEY = "lastActivityAt";

const PASSIVE = { passive: true } as const;
const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

interface Options {
  timeoutMs?: number;
  onIdle: () => void;
  onActivity?: (at: number) => void;
}

export function useInactivityTimer({ timeoutMs = 30 * 60 * 1000, onIdle, onActivity }: Options): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastUpdate = Date.now();
    let fired = false;

    function updateActivity(): void {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;
      lastUpdate = now;
      try {
        sessionStorage.setItem(ACTIVITY_KEY, String(now));
      } catch {}
      onActivityRef.current?.(now);
    }

    function check(): void {
      if (fired) return;
      const stored = sessionStorage.getItem(ACTIVITY_KEY);
      const lastActivity = stored ? Number(stored) : lastUpdate;
      if (Date.now() - lastActivity >= timeoutMs) {
        fired = true;
        clearInterval(intervalId);
        onIdleRef.current();
      }
    }

    // initialise activity timestamp
    try {
      if (!sessionStorage.getItem(ACTIVITY_KEY)) {
        sessionStorage.setItem(ACTIVITY_KEY, String(Date.now()));
      }
    } catch {}

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, updateActivity, PASSIVE));

    const getInterval = () =>
      document.visibilityState === "hidden" ? 60_000 : 30_000;

    let intervalId = setInterval(check, getInterval());

    function onVisibility(): void {
      clearInterval(intervalId);
      intervalId = setInterval(check, getInterval());
      updateActivity();
    }
    document.addEventListener("visibilitychange", onVisibility, PASSIVE);

    return () => {
      clearInterval(intervalId);
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, updateActivity));
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [timeoutMs]);
}
