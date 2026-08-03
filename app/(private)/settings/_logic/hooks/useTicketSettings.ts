"use client";

import { useState, useEffect, useCallback } from "react";
import { getTicketSettings } from "../services/getTicketSettings";
import type { TicketSettingsDto } from "../types/api";

interface UseTicketSettingsResult {
  settings: TicketSettingsDto | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useTicketSettings(): UseTicketSettingsResult {
  const [settings, setSettings] = useState<TicketSettingsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getTicketSettings()
      .then((data) => { if (!cancelled) { setSettings(data); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err as Error); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [version]);

  return { settings, isLoading, error, refresh };
}
