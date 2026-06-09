"use client";

import { useState, useCallback } from "react";
import { createProvider } from "../services/createProvider";
import { updateProvider } from "../services/updateProvider";
import { softDeleteProvider } from "../services/softDeleteProvider";
import { ProviderCodeAlreadyInUseError, ProviderRfcAlreadyInUseError } from "../errors";
import type { CreateProviderBody, UpdateProviderBody } from "../types/api";
import type { Provider } from "../types/domain";

interface UseProviderMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  /** Throws ProviderCodeAlreadyInUseError / ProviderRfcAlreadyInUseError so caller can map inline; other errors are captured in mutationError. */
  createOne: (body: CreateProviderBody) => Promise<Provider | null>;
  /** Returns null if body is empty (no request). Throws ProviderRfcAlreadyInUseError. */
  updateOne: (id: string, body: UpdateProviderBody) => Promise<Provider | null>;
  softDeleteOne: (id: string) => Promise<boolean>;
  reactivateOne: (id: string) => Promise<Provider | null>;
}

export function useProviderMutations(): UseProviderMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreateProviderBody): Promise<Provider | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await createProvider({ body });
    } catch (err) {
      if (err instanceof ProviderCodeAlreadyInUseError || err instanceof ProviderRfcAlreadyInUseError) {
        throw err;
      }
      setMutationError((err as Error).message ?? "Error al crear proveedor.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdateProviderBody): Promise<Provider | null> => {
    if (Object.keys(body).length === 0) return null;
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updateProvider({ id, body });
    } catch (err) {
      if (err instanceof ProviderRfcAlreadyInUseError) {
        throw err;
      }
      setMutationError((err as Error).message ?? "Error al actualizar proveedor.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const softDeleteOne = useCallback(async (id: string): Promise<boolean> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      await softDeleteProvider({ id });
      return true;
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al desactivar proveedor.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const reactivateOne = useCallback(
    async (id: string): Promise<Provider | null> => {
      return updateOne(id, { isActive: true });
    },
    [updateOne],
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
