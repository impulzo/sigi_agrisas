"use client";

import { useState, useEffect } from "react";
import { authFetch } from "../_lib/authFetch";

export interface SatCodeOption {
  code: string;
  description: string;
}

const DEBOUNCE_MS = 300;
const MIN_LENGTH = 2;

interface UseSatCodesSearchResult {
  options: SatCodeOption[];
  isLoading: boolean;
}

export function useSatCodesSearch(query: string): UseSatCodesSearchResult {
  const [options, setOptions] = useState<SatCodeOption[]>([]);
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
      authFetch(`/api/v1/admin/sat-codes?search=${encodeURIComponent(trimmed)}`)
        .then((res) => res.json())
        .then((body: { items: SatCodeOption[] }) => {
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
  }, [query]);

  return { options, isLoading };
}
