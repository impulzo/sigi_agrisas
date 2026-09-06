"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";
import { redactSpeedInsightsUrl } from "./redactSpeedInsightsUrl";

interface SpeedInsightsTrackerProps {
  enabled: boolean;
  debug: boolean;
}

/**
 * `enabled` gates real event delivery to Vercel (production only — the
 * Hobby plan's 10k events/30d quota is shared between preview and prod).
 * Outside production the script still mounts in debug mode so wiring can be
 * verified in the console, but `beforeSend` discards the event.
 */
export function SpeedInsightsTracker({ enabled, debug }: SpeedInsightsTrackerProps) {
  return (
    <SpeedInsights
      debug={debug}
      beforeSend={(data) => {
        if (!enabled) return null;
        return { ...data, url: redactSpeedInsightsUrl(data.url) };
      }}
    />
  );
}
