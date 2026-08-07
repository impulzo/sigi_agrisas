"use client";

import { useState, useEffect } from "react";
import { authFetch } from "../_lib/authFetch";

export type SatCatalog = "regimen-fiscal" | "uso-cfdi";

export interface SatCatalogOption {
  code: string;
  description: string;
}

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 2;

interface UseSatCatalogSearchResult {
  options: SatCatalogOption[];
  isLoading: boolean;
}

export function useSatCatalogSearch(catalog: SatCatalog, query: string): UseSatCatalogSearchResult {
  const [options, setOptions] = useState<SatCatalogOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_LENGTH) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    const timer = setTimeout(() => {
      authFetch(
        `/api/v1/admin/sat-codes/${catalog}?search=${encodeURIComponent(trimmed)}`
      )
        .then((res) => res.json())
        .then((body: { items: SatCatalogOption[] }) => {
          if (!cancelled) setOptions(body.items ?? []);
        })
        .catch(() => {
          if (!cancelled) setOptions([]);
        })
        .finally(() => {
          if (!cancelled) setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [catalog, query]);

  return { options, isLoading };
}
