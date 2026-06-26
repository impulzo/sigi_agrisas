"use client";

import { useState, useEffect, useCallback } from "react";
import { listTaxRates } from "../services/taxRates";
import type { TaxRate } from "../types/domain";

interface UseTaxRatesListResult {
  items: TaxRate[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTaxRatesList({
  page,
  pageSize,
  includeInactive,
}: {
  page: number;
  pageSize: number;
  includeInactive?: boolean;
}): UseTaxRatesListResult {
  const [items, setItems] = useState<TaxRate[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listTaxRates({ page, pageSize, includeInactive })
      .then((data) => {
        if (!cancelled) { setItems(data.items); setTotal(data.total); }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Error al cargar");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, pageSize, includeInactive, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  return { items, total, isLoading, error, refresh };
}
