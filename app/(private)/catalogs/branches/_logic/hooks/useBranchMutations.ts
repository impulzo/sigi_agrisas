"use client";

import { useState, useCallback } from "react";
import { createBranch } from "../services/createBranch";
import { updateBranch } from "../services/updateBranch";
import { softDeleteBranch } from "../services/softDeleteBranch";
import type { CreateBranchBody, UpdateBranchBody } from "../types/api";
import type { Branch } from "../types/domain";

interface UseBranchMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  createOne: (body: CreateBranchBody) => Promise<Branch | null>;
  updateOne: (id: string, body: UpdateBranchBody) => Promise<Branch | null>;
  softDeleteOne: (id: string) => Promise<boolean>;
  reactivateOne: (id: string) => Promise<Branch | null>;
}

export function useBranchMutations(): UseBranchMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreateBranchBody): Promise<Branch | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await createBranch({ body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al crear");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdateBranchBody): Promise<Branch | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updateBranch({ id, body });
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
      await softDeleteBranch({ id });
      return true;
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al eliminar");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const reactivateOne = useCallback(
    async (id: string): Promise<Branch | null> => {
      return updateOne(id, { isActive: true });
    },
    [updateOne],
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
