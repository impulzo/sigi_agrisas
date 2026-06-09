"use client";

import { useState, useEffect, useCallback } from "react";
import { getSale } from "../services";
import type { SaleDetail } from "../types/domain";

interface UseSaleDetailResult {
  sale: SaleDetail | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useSaleDetail(id: string): UseSaleDetailResult {
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setIsLoading(true);
    setError(null);

    getSale(id)
      .then((result) => {
        setSale(result);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setIsLoading(false);
      });
  }, [id, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { sale, isLoading, error, refresh };
}
