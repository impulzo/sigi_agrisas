"use client";

import { useState, useEffect, useCallback } from "react";
import { listSaleReturns } from "../services";
import type { Return } from "../types/domain";

interface UseSaleReturnsResult {
  returns: Return[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useSaleReturns(saleId: string): UseSaleReturnsResult {
  const [returns, setReturns] = useState<Return[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    listSaleReturns(saleId)
      .then((result) => {
        setReturns(result);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setIsLoading(false);
      });
  }, [saleId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { returns, isLoading, error, refresh };
}
