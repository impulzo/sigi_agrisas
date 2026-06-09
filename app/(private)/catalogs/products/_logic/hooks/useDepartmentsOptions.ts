"use client";

import { useState, useEffect } from "react";
import { authFetch } from "../../../../../_lib/authFetch";

interface DepartmentOption {
  id: string;
  name: string;
}

interface CacheEntry {
  options: DepartmentOption[];
  expiresAt: number;
  promise?: Promise<DepartmentOption[]>;
}

const CACHE_TTL_MS = 5 * 60_000;
let cache: CacheEntry | null = null;

async function fetchDepartments(): Promise<DepartmentOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/departments?pageSize=100&includeInactive=false")
    .then((res) => res.json())
    .then((body: { items: { id: string; name: string }[] }) => {
      const options = body.items.map((d) => ({ id: d.id, name: d.name }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      if (cache) delete cache.promise;
      return [] as DepartmentOption[];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UseDepartmentsOptionsResult {
  options: DepartmentOption[];
  isLoading: boolean;
}

export function useDepartmentsOptions(): UseDepartmentsOptionsResult {
  const [options, setOptions] = useState<DepartmentOption[]>(cache?.options ?? []);
  const [isLoading, setIsLoading] = useState(!cache || !cache.expiresAt);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchDepartments().then((opts) => {
      if (!cancelled) {
        setOptions(opts);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { options, isLoading };
}
