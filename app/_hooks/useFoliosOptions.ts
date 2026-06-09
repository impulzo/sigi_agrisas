"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

export interface FolioOption {
  id: string;
  code: string;
  name: string;
  prefix?: string | null;
  currentNumber: number;
  isActive: boolean;
}

interface CacheEntry {
  options: FolioOption[];
  expiresAt: number;
  promise?: Promise<FolioOption[]>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchFolios(): Promise<FolioOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/folios?pageSize=100&includeInactive=false")
    .then((res) => res.json())
    .then((body: { items: Array<Record<string, unknown>> }) => {
      const options: FolioOption[] = body.items.map((f) => ({
        id: f.id as string,
        code: f.code as string,
        name: f.name as string,
        prefix: f.prefix as string | null | undefined,
        currentNumber: f.currentNumber as number,
        isActive: f.isActive as boolean,
      }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      cache = null;
      return [] as FolioOption[];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UseFoliosOptionsResult {
  options: FolioOption[];
  isLoading: boolean;
  refresh: () => void;
}

export function useFoliosOptions(): UseFoliosOptionsResult {
  const [options, setOptions] = useState<FolioOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchFolios().then((opts) => {
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
