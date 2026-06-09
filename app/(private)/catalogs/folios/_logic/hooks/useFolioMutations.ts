"use client";

import { useState, useCallback } from "react";
import { createFolio } from "../services/createFolio";
import { updateFolio } from "../services/updateFolio";
import { softDeleteFolio } from "../services/softDeleteFolio";
import type { CreateFolioBody, UpdateFolioBody } from "../types/api";
import type { Folio } from "../types/domain";

interface UseFolioMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  createOne: (body: CreateFolioBody) => Promise<Folio | null>;
  updateOne: (id: string, body: UpdateFolioBody) => Promise<Folio | null>;
  softDeleteOne: (id: string) => Promise<boolean>;
  reactivateOne: (id: string) => Promise<Folio | null>;
}

export function useFolioMutations(): UseFolioMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreateFolioBody): Promise<Folio | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await createFolio({ body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al crear");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdateFolioBody): Promise<Folio | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updateFolio({ id, body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al actualizar");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const softDeleteOne = useCallback(async (id: string): Promise<boolean> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      await softDeleteFolio({ id });
      return true;
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al eliminar");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const reactivateOne = useCallback(
    async (id: string): Promise<Folio | null> => {
      return updateOne(id, { isActive: true });
    },
    [updateOne],
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
