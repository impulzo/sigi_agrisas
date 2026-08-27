"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

export type InventoryScopeMode = "general" | "branch";

interface CacheEntry {
  mode: InventoryScopeMode;
  expiresAt: number;
  promise?: Promise<InventoryScopeMode>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchInventoryScopeMode(): Promise<InventoryScopeMode> {
  if (cache && Date.now() < cache.expiresAt) return cache.mode;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/settings/inventory-scope")
    .then((res) => res.json())
    .then((body: { mode: InventoryScopeMode }) => {
      const result = body.mode === "branch" ? "branch" : "general";
      cache = { mode: result, expiresAt: Date.now() + CACHE_TTL_MS };
      return result;
    })
    .catch(() => {
      cache = null;
      return "general" as InventoryScopeMode;
    });

  cache = { mode: "general", expiresAt: 0, promise };
  return promise;
}

interface UseInventoryScopeModeResult {
  mode: InventoryScopeMode;
  isLoading: boolean;
  refresh: () => void;
}

export function useInventoryScopeMode(): UseInventoryScopeModeResult {
  const [mode, setMode] = useState<InventoryScopeMode>("general");
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchInventoryScopeMode().then((result) => {
      if (!cancelled) {
        setMode(result);
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

  return { mode, isLoading, refresh };
}
