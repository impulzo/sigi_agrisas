"use client";

import { useState, useEffect, useCallback } from "react";
import { listProviders } from "../services/listProviders";
import type { Provider } from "../types/domain";

interface UseProvidersResult {
  items: Provider[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseProvidersParams {
  page: number;
  pageSize: number;
  search?: string;
  includeInactive?: boolean;
}

export function useProviders({ page, pageSize, search, includeInactive }: UseProvidersParams): UseProvidersResult {
  const [items, setItems] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listProviders({ page, pageSize, search, includeInactive }, undefined, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.name === "AbortError") return;
        setError(err.message ?? "Error al cargar proveedores.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, pageSize, search, includeInactive, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, isLoading, error, refresh };
}
