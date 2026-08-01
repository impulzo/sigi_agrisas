"use client";

import { useState, useEffect, useCallback } from "react";
import { getPurchase } from "../services";
import type { PurchaseDetail } from "../types/domain";

interface UsePurchaseDetailResult {
  purchaseDetail: PurchaseDetail | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function usePurchaseDetail(id: string): UsePurchaseDetailResult {
  const [purchaseDetail, setPurchaseDetail] = useState<PurchaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getPurchase(id)
      .then((result) => {
        setPurchaseDetail(result);
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

  return { purchaseDetail, isLoading, error, refresh };
}
