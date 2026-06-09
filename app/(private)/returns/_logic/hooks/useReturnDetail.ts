"use client";

import { useState, useEffect, useCallback } from "react";
import { getReturn } from "../services";
import type { ReturnDetail } from "../types/domain";

interface UseReturnDetailResult {
  returnDetail: ReturnDetail | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useReturnDetail(id: string): UseReturnDetailResult {
  const [returnDetail, setReturnDetail] = useState<ReturnDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getReturn(id)
      .then((result) => {
        setReturnDetail(result);
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

  return { returnDetail, isLoading, error, refresh };
}
