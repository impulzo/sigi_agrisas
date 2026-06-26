"use client";

import { useState, useCallback } from "react";
import { createTaxRate, updateTaxRate, deactivateTaxRate } from "../services/taxRates";
import { TaxRateInUseByProductsError } from "../errors";
import type { CreateTaxRateBody, UpdateTaxRateBody } from "../types/api";
import type { TaxRate } from "../types/domain";

interface UseTaxRateMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  createOne: (body: CreateTaxRateBody) => Promise<TaxRate | null>;
  updateOne: (id: string, body: UpdateTaxRateBody) => Promise<TaxRate | null>;
  softDeleteOne: (id: string) => Promise<void>;
  reactivateOne: (id: string) => Promise<TaxRate | null>;
}

export function useTaxRateMutations(): UseTaxRateMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreateTaxRateBody): Promise<TaxRate | null> => {
    setIsSaving(true); setMutationError(null);
    try { return await createTaxRate(body); }
    catch (err) { setMutationError((err as Error).message ?? "Error al crear"); return null; }
    finally { setIsSaving(false); }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdateTaxRateBody): Promise<TaxRate | null> => {
    setIsSaving(true); setMutationError(null);
    try { return await updateTaxRate(id, body); }
    catch (err) { setMutationError((err as Error).message ?? "Error al actualizar"); return null; }
    finally { setIsSaving(false); }
  }, []);

  const softDeleteOne = useCallback(async (id: string): Promise<void> => {
    setIsSaving(true); setMutationError(null);
    try { await deactivateTaxRate(id); }
    catch (err) {
      if (err instanceof TaxRateInUseByProductsError) throw err;
      setMutationError((err as Error).message ?? "Error al desactivar");
    }
    finally { setIsSaving(false); }
  }, []);

  const reactivateOne = useCallback(
    async (id: string): Promise<TaxRate | null> => updateOne(id, { isActive: true }),
    [updateOne]
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
