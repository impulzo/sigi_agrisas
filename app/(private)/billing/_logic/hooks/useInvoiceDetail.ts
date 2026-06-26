"use client";

import { useState, useEffect, useCallback } from "react";
import { getInvoice } from "../services";
import type { Invoice } from "../types/domain";

interface UseInvoiceDetailResult {
  invoice: Invoice | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useInvoiceDetail(id: string): UseInvoiceDetailResult {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id || id === "__skip__") { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    getInvoice(id)
      .then((inv) => { setInvoice(inv); setIsLoading(false); })
      .catch((err: Error) => { setError(err); setIsLoading(false); });
  }, [id, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { invoice, isLoading, error, refresh };
}
