"use client";

import { useState, useEffect, useCallback } from "react";
import { listPurchases } from "../services";
import type { Purchase, PurchaseFilters } from "../types/domain";

interface UsePurchasesListResult {
  items: Purchase[];
  total: number;
  page: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function usePurchasesList(filters: PurchaseFilters): UsePurchasesListResult {
  const [items, setItems] = useState<Purchase[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const { page, pageSize, status, branchId, providerId, from, to } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listPurchases({ page, pageSize, status, branchId, providerId, from, to, signal: controller.signal })
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
  }, [page, pageSize, JSON.stringify(status), branchId, providerId, from, to, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, page, isLoading, error, refresh };
}
