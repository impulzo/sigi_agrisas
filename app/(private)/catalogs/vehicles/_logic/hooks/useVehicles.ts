"use client";

import { useState, useEffect, useCallback } from "react";
import { listVehicles } from "../services/listVehicles";
import type { Vehicle } from "../types/domain";

interface UseVehiclesResult {
  items: Vehicle[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseVehiclesParams {
  page: number;
  pageSize: number;
  search?: string;
  includeInactive?: boolean;
}

export function useVehicles({ page, pageSize, search, includeInactive }: UseVehiclesParams): UseVehiclesResult {
  const [items, setItems] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listVehicles({ page, pageSize, search, includeInactive }, undefined, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.name === "AbortError") return;
        setError(err.message ?? "Error al cargar vehículos.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [page, pageSize, search, includeInactive, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, isLoading, error, refresh };
}
