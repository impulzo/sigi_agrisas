"use client";

import { useState, useCallback } from "react";
import { cancelReturn, createReturn } from "../services";
import type { ReturnDetail } from "../types/domain";
import type { CreateReturnRequest } from "../types/api";

interface UseReturnMutationsResult {
  isSaving: boolean;
  mutationError: Error | null;
  clearError: () => void;
  cancel: (id: string, reason?: string | null) => Promise<ReturnDetail | null>;
  create: (body: CreateReturnRequest) => Promise<ReturnDetail | null>;
}

export function useReturnMutations(onChange?: (updated: ReturnDetail) => void): UseReturnMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const cancel = useCallback(async (id: string, reason?: string | null): Promise<ReturnDetail | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await cancelReturn(id, { reason });
      onChange?.(result);
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onChange]);

  const create = useCallback(async (body: CreateReturnRequest): Promise<ReturnDetail | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await createReturn(body);
      onChange?.(result);
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onChange]);

  return { isSaving, mutationError, clearError, cancel, create };
}
