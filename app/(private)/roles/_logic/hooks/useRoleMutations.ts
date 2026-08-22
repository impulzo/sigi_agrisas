"use client";

import { useState, useCallback } from "react";
import { createRole as createRoleService } from "../services/createRole";
import { RoleAlreadyExistsError, ValidationError } from "../types/domain";
import type { CreateRolePayload } from "../types/api";
import type { Role } from "../types/domain";

interface UseRoleMutationsResult {
  isSaving: boolean;
  error: string | null;
  clearError: () => void;
  createRole: (payload: CreateRolePayload) => Promise<Role | null>;
}

export function useRoleMutations(): UseRoleMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const createRole = useCallback(async (payload: CreateRolePayload): Promise<Role | null> => {
    setIsSaving(true);
    setError(null);
    try {
      return await createRoleService(payload);
    } catch (err) {
      if (err instanceof RoleAlreadyExistsError || err instanceof ValidationError) throw err;
      setError((err as Error).message ?? "Error al crear el rol.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { isSaving, error, clearError, createRole };
}
