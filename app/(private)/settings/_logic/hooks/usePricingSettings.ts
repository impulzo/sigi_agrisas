"use client";

import { useState, useEffect, useCallback } from "react";
import { getPricingSettings } from "../services/getPricingSettings";
import type { PricingSettingsDto } from "../types/api";

interface UsePricingSettingsResult {
  settings: PricingSettingsDto | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function usePricingSettings(): UsePricingSettingsResult {
  const [settings, setSettings] = useState<PricingSettingsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getPricingSettings()
      .then((data) => { if (!cancelled) { setSettings(data); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err as Error); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [version]);

  return { settings, isLoading, error, refresh };
}
