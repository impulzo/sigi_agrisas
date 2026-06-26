"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

export type FolioScope = "POS" | "INVENTORY" | "OPERATIONS";

export interface FolioOption {
  id: string;
  code: string;
  name: string;
  prefix?: string | null;
  scope: FolioScope;
  currentNumber: number;
  isActive: boolean;
}

interface CacheEntry {
  options: FolioOption[];
  expiresAt: number;
  promise?: Promise<FolioOption[]>;
}

const CACHE_TTL_MS = 60_000;
const cache: Map<string, CacheEntry> = new Map();

function cacheKey(scope?: FolioScope): string {
  return scope ?? "_all";
}

async function fetchFolios(scope?: FolioScope): Promise<FolioOption[]> {
  const key = cacheKey(scope);
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.options;
  if (entry?.promise) return entry.promise;

  const url = scope
    ? `/api/v1/admin/folios?pageSize=100&includeInactive=false&scope=${scope}`
    : "/api/v1/admin/folios?pageSize=100&includeInactive=false";

  const promise = authFetch(url)
    .then((res) => res.json())
    .then((body: { items: Array<Record<string, unknown>> }) => {
      const options: FolioOption[] = body.items.map((f) => ({
        id: f.id as string,
        code: f.code as string,
        name: f.name as string,
        prefix: f.prefix as string | null | undefined,
        scope: f.scope as FolioScope,
        currentNumber: f.currentNumber as number,
        isActive: f.isActive as boolean,
      }));
      cache.set(key, { options, expiresAt: Date.now() + CACHE_TTL_MS });
      return options;
    })
    .catch(() => {
      cache.delete(key);
      return [] as FolioOption[];
    });

  cache.set(key, { options: [], expiresAt: 0, promise });
  return promise;
}

interface UseFoliosOptionsResult {
  options: FolioOption[];
  isLoading: boolean;
  refresh: () => void;
}

export interface UseFoliosOptionsArgs {
  scope?: FolioScope;
}

export function useFoliosOptions(args?: UseFoliosOptionsArgs): UseFoliosOptionsResult {
  const scope = args?.scope;
  const [options, setOptions] = useState<FolioOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchFolios(scope).then((opts) => {
      if (!cancelled) {
        setOptions(opts);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [scope]);

  useEffect(() => {
    return load();
  }, [load]);

  const refresh = useCallback(() => {
    cache.delete(cacheKey(scope));
    load();
  }, [load, scope]);

  return { options, isLoading, refresh };
}
