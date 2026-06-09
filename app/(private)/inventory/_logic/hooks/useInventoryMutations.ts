"use client";

import { useState, useCallback } from "react";
import { assignProduct, updateInventoryItem, adjustStock, removeInventoryItem } from "../services/inventory";
import {
  InventoryAlreadyExistsError,
  NegativeStockNotAllowedError,
  InventoryTargetInvalidError,
} from "../errors";
import type { AssignProductBody, UpdateInventoryBody, AdjustStockBody } from "../types/api";
import type { InventoryItem } from "../types/domain";

interface UseInventoryMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  assignOne: (branchId: string, body: AssignProductBody) => Promise<InventoryItem | null>;
  updateOne: (branchId: string, productId: string, body: UpdateInventoryBody) => Promise<InventoryItem | null>;
  adjustOne: (branchId: string, productId: string, body: AdjustStockBody) => Promise<InventoryItem | null>;
  removeOne: (branchId: string, productId: string) => Promise<boolean>;
}

export function useInventoryMutations(): UseInventoryMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const assignOne = useCallback(async (branchId: string, body: AssignProductBody): Promise<InventoryItem | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await assignProduct({ branchId, body });
    } catch (err) {
      if (err instanceof InventoryAlreadyExistsError || err instanceof InventoryTargetInvalidError) throw err;
      setMutationError((err as Error).message ?? "Error al asignar producto.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (branchId: string, productId: string, body: UpdateInventoryBody): Promise<InventoryItem | null> => {
    if (Object.keys(body).length === 0) return null;
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updateInventoryItem({ branchId, productId, body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al actualizar inventario.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const adjustOne = useCallback(async (branchId: string, productId: string, body: AdjustStockBody): Promise<InventoryItem | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await adjustStock({ branchId, productId, body });
    } catch (err) {
      if (err instanceof NegativeStockNotAllowedError) throw err;
      setMutationError((err as Error).message ?? "Error al ajustar stock.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const removeOne = useCallback(async (branchId: string, productId: string): Promise<boolean> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      await removeInventoryItem({ branchId, productId });
      return true;
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al quitar producto.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { isSaving, mutationError, clearError, assignOne, updateOne, adjustOne, removeOne };
}
