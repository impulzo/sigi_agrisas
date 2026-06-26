"use client";

import { useState, useEffect, useCallback } from "react";
import { listSaleInvoices } from "../services";
import type { Invoice } from "../types/domain";

interface UseSaleInvoicesResult {
  invoices: Invoice[];
  hasStampedInvoice: boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useSaleInvoices(saleId: string): UseSaleInvoicesResult {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!saleId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    listSaleInvoices(saleId)
      .then((items) => { setInvoices(items); setIsLoading(false); })
      .catch((err: Error) => { setError(err); setIsLoading(false); });
  }, [saleId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);
  const hasStampedInvoice = invoices.some((inv) => inv.status === "stamped");

  return { invoices, hasStampedInvoice, isLoading, error, refresh };
}
