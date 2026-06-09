"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

export interface PaymentMethodOption {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface CacheEntry {
  options: PaymentMethodOption[];
  expiresAt: number;
  promise?: Promise<PaymentMethodOption[]>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchPaymentMethods(): Promise<PaymentMethodOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/payment-methods?pageSize=100&includeInactive=false")
    .then((res) => res.json())
    .then((body: { items: Array<Record<string, unknown>> }) => {
      const options: PaymentMethodOption[] = body.items.map((p) => ({
        id: p.id as string,
        code: p.code as string,
        name: p.name as string,
        isActive: p.isActive as boolean,
      }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      cache = null;
      return [] as PaymentMethodOption[];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UsePaymentMethodsOptionsResult {
  options: PaymentMethodOption[];
  isLoading: boolean;
  refresh: () => void;
}

export function usePaymentMethodsOptions(): UsePaymentMethodsOptionsResult {
  const [options, setOptions] = useState<PaymentMethodOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchPaymentMethods().then((opts) => {
      if (!cancelled) {
        setOptions(opts);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return load();
  }, [load]);

  const refresh = useCallback(() => {
    cache = null;
    load();
  }, [load]);

  return { options, isLoading, refresh };
}
