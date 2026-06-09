"use client";

import { useState, useEffect, useCallback } from "react";
import { listSalePayments } from "../services";
import type { SalePaymentsData } from "../types/domain";

interface UseSalePaymentsResult {
  payments: SalePaymentsData["payments"];
  paidAmount: number;
  total: number;
  paymentStatus: SalePaymentsData["paymentStatus"];
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useSalePayments(saleId: string): UseSalePaymentsResult {
  const [data, setData] = useState<SalePaymentsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!saleId) return;
    setIsLoading(true);
    setError(null);

    listSalePayments(saleId)
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setIsLoading(false);
      });
  }, [saleId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return {
    payments: data?.payments ?? [],
    paidAmount: data?.paidAmount ?? 0,
    total: data?.total ?? 0,
    paymentStatus: data?.paymentStatus ?? "pending",
    isLoading,
    error,
    refresh,
  };
}
