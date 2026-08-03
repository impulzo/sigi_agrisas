"use client";

import { useState, useEffect, useCallback } from "react";
import { searchProviders } from "../services/searchProviders";
import type { ProviderDto } from "../types/api";

interface UseProviderSearchParams {
  search: string;
  page?: number;
  pageSize?: number;
}

interface UseProviderSearchResult {
  items: ProviderDto[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useProviderSearch({
  search,
  page = 1,
  pageSize = 20,
}: UseProviderSearchParams): UseProviderSearchResult {
  const [items, setItems] = useState<ProviderDto[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    searchProviders({ search, page, pageSize, signal: controller.signal })
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
