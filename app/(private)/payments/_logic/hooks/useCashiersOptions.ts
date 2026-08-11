"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../../../../_lib/authFetch";

export interface CashierOption {
  id: string;
  name: string;
}

interface CacheEntry {
  options: CashierOption[];
  expiresAt: number;
  promise?: Promise<CashierOption[]>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchCashiers(): Promise<CashierOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/users?pageSize=100")
    .then((res) => res.json())
    .then((body: { users: Array<{ id: string; name?: string; email: string }> }) => {
      const options: CashierOption[] = body.users.map((u) => ({
        id: u.id,
        name: u.name?.trim() ? u.name : u.email,
      }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      cache = null;
      return [] as CashierOption[];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UseCashiersOptionsResult {
  options: CashierOption[];
  isLoading: boolean;
  refresh: () => void;
}

export function useCashiersOptions(): UseCashiersOptionsResult {
  const [options, setOptions] = useState<CashierOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchCashiers().then((opts) => {
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
