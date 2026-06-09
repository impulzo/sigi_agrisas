"use client";

import { useState, useCallback } from "react";
import { cancelPayment } from "../services";

interface UsePaymentMutationsResult {
  isSaving: boolean;
  mutationError: Error | null;
  clearError: () => void;
  cancel: (id: string, reason?: string) => Promise<boolean>;
}

export function usePaymentMutations(onSuccess?: () => void): UsePaymentMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const cancel = useCallback(async (id: string, reason?: string): Promise<boolean> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      await cancelPayment(id, { reason });
      onSuccess?.();
      return true;
    } catch (err) {
      setMutationError(err as Error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [onSuccess]);

  return { isSaving, mutationError, clearError, cancel };
}
