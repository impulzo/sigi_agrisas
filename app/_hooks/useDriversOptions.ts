"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

export interface DriverOption {
  id: string;
  code: string;
  name: string;
  rfc: string | null;
  licenseNumber: string;
}

interface CacheEntry {
  options: DriverOption[];
  expiresAt: number;
  promise?: Promise<DriverOption[]>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchDrivers(): Promise<DriverOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/drivers?pageSize=100&includeInactive=false")
    .then((res) => res.json())
    .then((body: { items: Array<Record<string, unknown>> }) => {
      const options: DriverOption[] = body.items.map((d) => ({
        id: d.id as string,
        code: d.code as string,
        name: d.name as string,
        rfc: d.rfc as string | null,
        licenseNumber: d.licenseNumber as string,
      }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      cache = null;
      return [] as DriverOption[];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UseDriversOptionsResult {
  options: DriverOption[];
  isLoading: boolean;
  refresh: () => void;
}

export function useDriversOptions(): UseDriversOptionsResult {
  const [options, setOptions] = useState<DriverOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchDrivers().then((opts) => {
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
