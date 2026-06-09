"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { listReturns } from "../services";
import type { Return, ReturnFilters } from "../types/domain";

interface UseReturnsListResult {
  items: Return[];
  total: number;
  page: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useReturnsList(filters: ReturnFilters): UseReturnsListResult {
  const [items, setItems] = useState<Return[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const { page, pageSize, status, branchId, customerId, saleId, from, to, search } = filters;
  const searchRef = useRef(search);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    searchRef.current = search;
    if (!search || search.length < 2) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(searchRef.current), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    listReturns({ page, pageSize, status, branchId, customerId, saleId, from, to, search: debouncedSearch, signal: controller.signal })
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
  }, [page, pageSize, JSON.stringify(status), branchId, customerId, saleId, from, to, debouncedSearch, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, page, isLoading, error, refresh };
}
