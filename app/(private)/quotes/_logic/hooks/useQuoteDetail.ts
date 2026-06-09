"use client";

import { useState, useEffect, useCallback } from "react";
import { getQuote } from "../services/getQuote";
import type { QuoteDetail } from "../types/domain";

interface UseQuoteDetailResult {
  quote: QuoteDetail | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useQuoteDetail(id: string): UseQuoteDetailResult {
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getQuote(id)
      .then((result) => {
        if (!cancelled) {
          setQuote(result);
          setIsLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err);
          setIsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [id, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { quote, isLoading, error, refresh };
}
