"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

interface BranchOption {
  id: string;
  name: string;
}

interface CacheEntry {
  options: BranchOption[];
  expiresAt: number;
  promise?: Promise<BranchOption[]>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchBranchesOptions(): Promise<BranchOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/branches?pageSize=100")
    .then((res) => res.json())
    .then((body: { items: { id: string; name: string; isActive: boolean }[] }) => {
      const options = body.items.filter((b) => b.isActive).map((b) => ({ id: b.id, name: b.name }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      cache = null;
      return [];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UseBranchesOptionsResult {
  options: BranchOption[];
  isLoading: boolean;
  refresh: () => void;
}

export function useBranchesOptions(): UseBranchesOptionsResult {
  const [options, setOptions] = useState<BranchOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchBranchesOptions().then((result) => {
      if (!cancelled) {
        setOptions(result);
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
