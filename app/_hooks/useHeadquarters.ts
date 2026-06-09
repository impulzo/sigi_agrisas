"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

interface HqBranch {
  id: string;
  code: string;
  name: string;
}

interface CacheEntry {
  hq: HqBranch | null;
  expiresAt: number;
  promise?: Promise<HqBranch | null>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchHeadquarters(): Promise<HqBranch | null> {
  if (cache && Date.now() < cache.expiresAt) return cache.hq;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/branches?pageSize=100&includeInactive=false")
    .then((res) => res.json())
    .then((body: { items: { id: string; code: string; name: string; isHeadquarters?: boolean }[] }) => {
      const hq = body.items.find((b) => b.isHeadquarters === true) ?? null;
      const result = hq ? { id: hq.id, code: hq.code, name: hq.name } : null;
      cache = { hq: result, expiresAt: Date.now() + CACHE_TTL_MS };
      return result;
    })
    .catch(() => {
      cache = null;
      return null;
    });

  cache = { hq: null, expiresAt: 0, promise };
  return promise;
}

interface UseHeadquartersResult {
  hq: HqBranch | null;
  isLoading: boolean;
  refresh: () => void;
}

export function useHeadquarters(): UseHeadquartersResult {
  const [hq, setHq] = useState<HqBranch | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchHeadquarters().then((result) => {
      if (!cancelled) {
        setHq(result);
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

  return { hq, isLoading, refresh };
}
