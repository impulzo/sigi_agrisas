"use client";

import { useState, useEffect, useCallback } from "react";
import { listWaybills } from "../services";
import type { WaybillSummary, WaybillFilters } from "../types/domain";

interface UseWaybillsListResult {
  items: WaybillSummary[];
  total: number;
  page: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useWaybillsList(filters: WaybillFilters): UseWaybillsListResult {
  const [items, setItems] = useState<WaybillSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const { page, pageSize, status, type, branchId, from, to } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listWaybills({ page, pageSize, status, type, branchId, from, to, signal: controller.signal })
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, JSON.stringify(status), JSON.stringify(type), branchId, from, to, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, page, isLoading, error, refresh };
}
