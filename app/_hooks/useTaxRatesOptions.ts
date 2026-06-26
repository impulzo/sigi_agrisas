"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

export interface TaxRateOption {
  id: string;
  code: string;
  name: string;
  rate: number;
  isActive: boolean;
}

interface CacheEntry {
  options: TaxRateOption[];
  expiresAt: number;
  promise?: Promise<TaxRateOption[]>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchTaxRates(): Promise<TaxRateOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/tax-rates?pageSize=100&includeInactive=false")
    .then((res) => res.json())
    .then((body: { items: Array<Record<string, unknown>> }) => {
      const options: TaxRateOption[] = body.items.map((p) => ({
        id: p.id as string,
        code: p.code as string,
        name: p.name as string,
        rate: p.rate as number,
        isActive: p.isActive as boolean,
      }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      cache = null;
      return [] as TaxRateOption[];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UseTaxRatesOptionsResult {
  options: TaxRateOption[];
  isLoading: boolean;
  refresh: () => void;
}

export function useTaxRatesOptions(): UseTaxRatesOptionsResult {
  const [options, setOptions] = useState<TaxRateOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchTaxRates().then((opts) => {
      if (!cancelled) { setOptions(opts); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { return load(); }, [load]);

  const refresh = useCallback(() => { cache = null; load(); }, [load]);

  return { options, isLoading, refresh };
}
