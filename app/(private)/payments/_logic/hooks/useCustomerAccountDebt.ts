"use client";

import { useState, useEffect, useCallback } from "react";
import { getCustomerAccountDebt } from "../services";
import type { AccountDebt } from "../types/domain";

interface UseCustomerAccountDebtResult {
  currentBalance: number;
  pendingSales: AccountDebt["pendingSales"];
  accountDebt: number;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useCustomerAccountDebt(customerId: string | null): UseCustomerAccountDebtResult {
  const [data, setData] = useState<AccountDebt | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!customerId) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);

    getCustomerAccountDebt(customerId)
      .then((result) => {
        setData(result);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        setError(err);
        setIsLoading(false);
      });
  }, [customerId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return {
    currentBalance: data?.currentBalance ?? 0,
    pendingSales: data?.pendingSales ?? [],
    accountDebt: data?.accountDebt ?? 0,
    isLoading,
    error,
    refresh,
  };
}
