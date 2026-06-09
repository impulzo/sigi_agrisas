"use client";

import { useState, useCallback } from "react";
import { createDepartment } from "../services/createDepartment";
import { updateDepartment } from "../services/updateDepartment";
import { softDeleteDepartment } from "../services/softDeleteDepartment";
import type { CreateDepartmentBody, UpdateDepartmentBody } from "../types/api";
import type { Department } from "../types/domain";

interface UseDepartmentMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  createOne: (body: CreateDepartmentBody) => Promise<Department | null>;
  updateOne: (id: string, body: UpdateDepartmentBody) => Promise<Department | null>;
  softDeleteOne: (id: string) => Promise<boolean>;
  reactivateOne: (id: string) => Promise<Department | null>;
}

export function useDepartmentMutations(): UseDepartmentMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreateDepartmentBody): Promise<Department | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await createDepartment({ body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al crear");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdateDepartmentBody): Promise<Department | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updateDepartment({ id, body });
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
      await softDeleteDepartment({ id });
      return true;
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al eliminar");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const reactivateOne = useCallback(
    async (id: string): Promise<Department | null> => {
      return updateOne(id, { isActive: true });
    },
    [updateOne],
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
