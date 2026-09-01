"use client";

import { useState, useEffect, useCallback } from "react";
import { getPrinterConfig } from "../services/getPrinterConfig";
import type { PrinterConfigDto } from "../types/api";

interface UsePrinterConfigResult {
  config: PrinterConfigDto | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function usePrinterConfig(branchId: string | null): UsePrinterConfigResult {
  const [config, setConfig] = useState<PrinterConfigDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!branchId) {
      setConfig(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    getPrinterConfig(branchId)
      .then((data) => { if (!cancelled) { setConfig(data); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err as Error); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [branchId, version]);

  return { config, isLoading, error, refresh };
}
