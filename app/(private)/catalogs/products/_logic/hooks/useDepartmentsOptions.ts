"use client";

import { useState, useEffect } from "react";
import { authFetch } from "../../../../../_lib/authFetch";

interface DepartmentOption {
  id: string;
  name: string;
  providerId: string | null;
  providerName: string | null;
}

interface CacheEntry {
  options: DepartmentOption[];
  expiresAt: number;
  promise?: Promise<DepartmentOption[]>;
}

const CACHE_TTL_MS = 5 * 60_000;
const cacheMap = new Map<string, CacheEntry>();

function cacheKey(providerId?: string): string {
  return providerId ?? "__all__";
}

async function fetchDepartments(providerId?: string): Promise<DepartmentOption[]> {
  const key = cacheKey(providerId);
  const cached = cacheMap.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.options;
  if (cached?.promise) return cached.promise;

  const url = new URL("/api/v1/admin/departments", "http://x");
  url.searchParams.set("pageSize", "100");
  url.searchParams.set("includeInactive", "false");
  if (providerId) url.searchParams.set("providerId", providerId);

  const promise = authFetch(url.pathname + url.search)
    .then((res) => res.json())
    .then((body: { items: { id: string; name: string; providerId?: string | null; providerName?: string | null }[] }) => {
      const options = body.items.map((d) => ({ id: d.id, name: d.name, providerId: d.providerId ?? null, providerName: d.providerName ?? null }));
      cacheMap.set(key, { options, expiresAt: Date.now() + CACHE_TTL_MS });
      return options;
    })
    .catch(() => {
      const entry = cacheMap.get(key);
      if (entry) delete entry.promise;
      return [] as DepartmentOption[];
    });

  cacheMap.set(key, { options: [], expiresAt: 0, promise });
  return promise;
}

interface UseDepartmentsOptionsResult {
  options: DepartmentOption[];
  isLoading: boolean;
}

export function useDepartmentsOptions(providerId?: string): UseDepartmentsOptionsResult {
  const key = cacheKey(providerId);
  const cached = cacheMap.get(key);
  const [options, setOptions] = useState<DepartmentOption[]>(cached?.options ?? []);
  const [isLoading, setIsLoading] = useState(!cached || !cached.expiresAt);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchDepartments(providerId).then((opts) => {
      if (!cancelled) { setOptions(opts); setIsLoading(false); }
    });
    return () => { cancelled = true; };
  }, [providerId]);

  return { options, isLoading };
}
