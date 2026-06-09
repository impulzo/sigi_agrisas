"use client";

import { useState, useEffect, useCallback } from "react";
import { listProducts } from "../services/products";
import type { Product } from "../types/domain";

interface UseProductsParams {
  page: number;
  pageSize: number;
  search?: string;
  departmentId?: string;
  includeInactive?: boolean;
}

interface UseProductsResult {
  items: Product[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useProducts({
  page,
  pageSize,
  search,
  departmentId,
  includeInactive,
}: UseProductsParams): UseProductsResult {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listProducts({ page, pageSize, search, departmentId, includeInactive }, undefined, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.name === "AbortError") return;
        setError(err.message ?? "Error al cargar productos.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, pageSize, search, departmentId, includeInactive, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, isLoading, error, refresh };
}
