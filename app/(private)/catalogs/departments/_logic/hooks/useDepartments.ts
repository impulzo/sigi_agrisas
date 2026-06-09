"use client";

import { useState, useEffect, useCallback } from "react";
import { listDepartments } from "../services/listDepartments";
import type { Department } from "../types/domain";

interface UseDepartmentsResult {
  items: Department[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDepartments({
  page,
  pageSize,
  includeInactive,
}: {
  page: number;
  pageSize: number;
  includeInactive?: boolean;
}): UseDepartmentsResult {
  const [items, setItems] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listDepartments({ page, pageSize, includeInactive })
      .then((data) => {
        if (!cancelled) {
          setItems(data.items);
          setTotal(data.total);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Error al cargar");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, includeInactive, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, isLoading, error, refresh };
}
