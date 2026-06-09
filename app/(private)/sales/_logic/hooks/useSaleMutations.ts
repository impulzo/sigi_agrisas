"use client";

import { useState, useCallback } from "react";
import { cancelSale, editSale } from "../services";
import type { SaleDetail } from "../types/domain";
import type { EditSaleBody } from "../types/api";

interface UseSaleMutationsResult {
  isSaving: boolean;
  mutationError: Error | null;
  clearError: () => void;
  cancel: (id: string, reason?: string) => Promise<SaleDetail | null>;
  edit: (id: string, body: EditSaleBody) => Promise<SaleDetail | null>;
}

export function useSaleMutations(onSuccess?: (sale: SaleDetail) => void): UseSaleMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const cancel = useCallback(async (id: string, reason?: string): Promise<SaleDetail | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await cancelSale(id, { reason });
      onSuccess?.(result);
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onSuccess]);

  const edit = useCallback(async (id: string, body: EditSaleBody): Promise<SaleDetail | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await editSale(id, body);
      onSuccess?.(result);
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onSuccess]);

  return { isSaving, mutationError, clearError, cancel, edit };
}
