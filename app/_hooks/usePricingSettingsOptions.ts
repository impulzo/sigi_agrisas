"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

interface CacheEntry {
  dosificationSurchargePct: number;
  expiresAt: number;
  promise?: Promise<number>;
}

const CACHE_TTL_MS = 60_000;
const DEFAULT_SURCHARGE_PCT = 5;
let cache: CacheEntry | null = null;

async function fetchDosificationSurchargePct(): Promise<number> {
  if (cache && Date.now() < cache.expiresAt) return cache.dosificationSurchargePct;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/settings/pricing")
    .then((res) => res.json())
    .then((body: { dosificationSurchargePct: number }) => {
      const dosificationSurchargePct = body.dosificationSurchargePct;
      cache = { dosificationSurchargePct, expiresAt: Date.now() + CACHE_TTL_MS };
      return dosificationSurchargePct;
    })
    .catch(() => {
      cache = null;
      return DEFAULT_SURCHARGE_PCT;
    });

  cache = { dosificationSurchargePct: DEFAULT_SURCHARGE_PCT, expiresAt: 0, promise };
  return promise;
}

interface UsePricingSettingsOptionsResult {
  dosificationSurchargePct: number;
  isLoading: boolean;
}

export function usePricingSettingsOptions(): UsePricingSettingsOptionsResult {
  const [dosificationSurchargePct, setDosificationSurchargePct] = useState(DEFAULT_SURCHARGE_PCT);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchDosificationSurchargePct().then((pct) => {
      if (!cancelled) {
        setDosificationSurchargePct(pct);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return load();
  }, [load]);

  return { dosificationSurchargePct, isLoading };
}
