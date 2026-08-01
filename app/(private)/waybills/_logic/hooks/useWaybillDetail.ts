"use client";

import { useState, useEffect, useCallback } from "react";
import { getWaybill } from "../services";
import type { WaybillDetail } from "../types/domain";

interface UseWaybillDetailResult {
  waybill: WaybillDetail | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useWaybillDetail(id: string): UseWaybillDetailResult {
  const [waybill, setWaybill] = useState<WaybillDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getWaybill(id)
      .then((result) => {
        setWaybill(result);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { waybill, isLoading, error, refresh };
}
