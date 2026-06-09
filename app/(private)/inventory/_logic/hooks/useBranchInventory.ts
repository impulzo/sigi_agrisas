"use client";

import { useState, useEffect, useCallback } from "react";
import { listBranchInventory } from "../services/inventory";
import type { InventoryItem } from "../types/domain";

interface UseBranchInventoryParams {
  branchId?: string;
  page: number;
  pageSize: number;
  search?: string;
  belowReorder?: boolean;
}

interface UseBranchInventoryResult {
  items: InventoryItem[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBranchInventory({
  branchId,
  page,
  pageSize,
  search,
  belowReorder,
}: UseBranchInventoryParams): UseBranchInventoryResult {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!branchId) {
      setItems([]);
      setTotal(0);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listBranchInventory({ branchId, page, pageSize, search, belowReorder }, undefined, controller.signal)
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err: Error) => {
        if (cancelled || err.name === "AbortError") return;
        setError(err.message ?? "Error al cargar inventario.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [branchId, page, pageSize, search, belowReorder, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { items, total, isLoading, error, refresh };
}
