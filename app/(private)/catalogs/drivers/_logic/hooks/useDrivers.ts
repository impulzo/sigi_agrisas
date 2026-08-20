"use client";

import { useState, useEffect, useCallback } from "react";
import { listDrivers } from "../services/listDrivers";
import type { Driver } from "../types/domain";

interface UseDriversResult {
  items: Driver[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseDriversParams {
  page: number;
  pageSize: number;
  search?: string;
  includeInactive?: boolean;
}

export function useDrivers({ page, pageSize, search, includeInactive }: UseDriversParams): UseDriversResult {
  const [items, setItems] = useState<Driver[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listDrivers({ page, pageSize, search, includeInactive }, undefined, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.name === "AbortError") return;
        setError(err.message ?? "Error al cargar operadores.");
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
