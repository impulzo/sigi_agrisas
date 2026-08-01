"use client";

import { useState, useCallback } from "react";
import { cancelPurchase, registerProviderPayment, cancelProviderPayment } from "../services";
import type { PurchaseDetail, ProviderPayment } from "../types/domain";

interface UsePurchaseMutationsResult {
  isSaving: boolean;
  mutationError: Error | null;
  clearError: () => void;
  cancel: (id: string, reason?: string | null) => Promise<PurchaseDetail | null>;
  registerPayment: (purchaseId: string, amount: number, notes?: string | null) => Promise<ProviderPayment | null>;
  cancelPayment: (id: string, reason?: string | null) => Promise<ProviderPayment | null>;
}

export function usePurchaseMutations(onChange?: () => void): UsePurchaseMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const cancel = useCallback(async (id: string, reason?: string | null): Promise<PurchaseDetail | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await cancelPurchase(id, { reason });
      onChange?.();
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onChange]);

  const registerPayment = useCallback(async (purchaseId: string, amount: number, notes?: string | null): Promise<ProviderPayment | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await registerProviderPayment(purchaseId, { amount, notes });
      onChange?.();
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onChange]);

  const cancelPayment = useCallback(async (id: string, reason?: string | null): Promise<ProviderPayment | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await cancelProviderPayment(id, { reason });
      onChange?.();
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onChange]);

  return { isSaving, mutationError, clearError, cancel, registerPayment, cancelPayment };
}
