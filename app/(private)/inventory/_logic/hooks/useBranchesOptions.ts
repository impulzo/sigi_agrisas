"use client";

import { useState, useEffect } from "react";
import { authFetch } from "../../../../_lib/authFetch";

interface BranchOption {
  id: string;
  name: string;
}

interface CacheEntry {
  options: BranchOption[];
  expiresAt: number;
  promise?: Promise<BranchOption[]>;
}

const CACHE_TTL_MS = 5 * 60_000;
let cache: CacheEntry | null = null;

async function fetchBranches(): Promise<BranchOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/branches?pageSize=100&includeInactive=false")
    .then((res) => res.json())
    .then((body: { items: { id: string; name: string }[] }) => {
      const options = body.items.map((b) => ({ id: b.id, name: b.name }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      if (cache) delete cache.promise;
      return [] as BranchOption[];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UseBranchesOptionsResult {
  options: BranchOption[];
  isLoading: boolean;
}

export function useBranchesOptions(): UseBranchesOptionsResult {
  const [options, setOptions] = useState<BranchOption[]>(cache?.options ?? []);
  const [isLoading, setIsLoading] = useState(!cache || !cache.expiresAt);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchBranches().then((opts) => {
      if (!cancelled) {
        setOptions(opts);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  return { options, isLoading };
}
