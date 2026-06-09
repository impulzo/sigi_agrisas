"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { listQuotes } from "../services/listQuotes";
import type { Quote, QuoteListFilters } from "../types/domain";
import { useDebounce } from "../../../../_hooks/useDebounce";

interface UseQuotesListResult {
  items: Quote[];
  total: number;
  page: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useQuotesList(filters: QuoteListFilters): UseQuotesListResult {
  const [items, setItems] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const debouncedSearch = useDebounce(filters.search ?? "", 300);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setIsLoading(true);
    setError(null);

    const effectiveFilters: QuoteListFilters = {
      ...filters,
      search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    };

    listQuotes(effectiveFilters)
      .then((result) => {
        if (ctrl.signal.aborted) return;
        setItems(result.items);
        setTotal(result.total);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (ctrl.signal.aborted) return;
        setError(err);
        setIsLoading(false);
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.page,
    filters.pageSize,
    filters.branchId,
    filters.customerId,
    filters.status,
    filters.from,
    filters.to,
    debouncedSearch,
    tick,
  ]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, page: filters.page, isLoading, error, refresh };
}
