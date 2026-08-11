"use client";

import { useState, useEffect, useCallback } from "react";
import { searchProducts } from "../services/searchProducts";
import type { ProductSearchResultDto } from "../types/api";

interface UseProductSearchParams {
  search: string;
  page?: number;
  pageSize?: number;
}

interface UseProductSearchResult {
  items: ProductSearchResultDto[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useProductSearch({
  search,
  page = 1,
  pageSize = 20,
}: UseProductSearchParams): UseProductSearchResult {
  const [items, setItems] = useState<ProductSearchResultDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    searchProducts({ search, page, pageSize, signal: controller.signal })
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
  }, [search, page, pageSize, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, isLoading, error, refresh };
}
