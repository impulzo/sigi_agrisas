"use client";

import { useState, useCallback } from "react";
import { createDriver } from "../services/createDriver";
import { updateDriver } from "../services/updateDriver";
import { DriverCodeAlreadyInUseError } from "../errors";
import type { CreateDriverBody, UpdateDriverBody } from "../types/api";
import type { Driver } from "../types/domain";

interface UseDriverMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  /** Throws DriverCodeAlreadyInUseError so caller can map inline; other errors are captured in mutationError. */
  createOne: (body: CreateDriverBody) => Promise<Driver | null>;
  updateOne: (id: string, body: UpdateDriverBody) => Promise<Driver | null>;
  /** No DELETE endpoint exists for this catalog — soft delete is PATCH {isActive:false}. */
  softDeleteOne: (id: string) => Promise<boolean>;
  reactivateOne: (id: string) => Promise<Driver | null>;
}

export function useDriverMutations(): UseDriverMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreateDriverBody): Promise<Driver | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await createDriver({ body });
    } catch (err) {
      if (err instanceof DriverCodeAlreadyInUseError) throw err;
      setMutationError((err as Error).message ?? "Error al crear operador.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdateDriverBody): Promise<Driver | null> => {
    if (Object.keys(body).length === 0) return null;
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updateDriver({ id, body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al actualizar operador.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const softDeleteOne = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await updateOne(id, { isActive: false });
      return result !== null;
    },
    [updateOne]
  );

  const reactivateOne = useCallback(
    async (id: string): Promise<Driver | null> => {
      return updateOne(id, { isActive: true });
    },
    [updateOne]
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
