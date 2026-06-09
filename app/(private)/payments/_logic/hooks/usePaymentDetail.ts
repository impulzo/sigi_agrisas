"use client";

import { useState, useEffect, useCallback } from "react";
import { getPayment } from "../services";
import type { PaymentDetail } from "../types/domain";

interface UsePaymentDetailResult {
  payment: PaymentDetail | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function usePaymentDetail(id: string): UsePaymentDetailResult {
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    setError(null);

    getPayment(id)
      .then((data) => {
        setPayment(data);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setIsLoading(false);
      });
  }, [id, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { payment, isLoading, error, refresh };
}
