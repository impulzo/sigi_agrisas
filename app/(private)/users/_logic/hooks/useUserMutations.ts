"use client";

import { useState, useCallback } from "react";
import { updateUser } from "../services/updateUser";
import { deleteUser } from "../services/deleteUser";
import { assignRoleToUser } from "../services/assignRoleToUser";
import { revokeRoleFromUser } from "../services/revokeRoleFromUser";
import type { User } from "../types/domain";
import type { RoleOption } from "../services/listAvailableRoles";

interface SaveDiffParams {
  userId: string;
  original: User;
  edited: {
    name: string;
    email: string;
    avatarUrlInput: string;
    avatarReset: boolean;
    stagedRoleIds: Set<string>;
  };
  catalog: RoleOption[];
}

interface UseUserMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  saveUserDiff: (params: SaveDiffParams) => Promise<User | null>;
  removeUser: (userId: string) => Promise<boolean>;
}

export function useUserMutations(): UseUserMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const saveUserDiff = useCallback(async ({ userId, original, edited, catalog }: SaveDiffParams): Promise<User | null> => {
    setIsSaving(true);
    setMutationError(null);

    try {
      const patchBody: { name?: string; email?: string; avatarUrl?: string | null } = {};
      let hasPatch = false;

      if (edited.name !== (original.name ?? "") && edited.name.trim() !== "") {
        patchBody.name = edited.name.trim();
        hasPatch = true;
      }
      if (edited.email !== original.email) {
        patchBody.email = edited.email;
        hasPatch = true;
      }
      if (edited.avatarReset) {
        patchBody.avatarUrl = null;
        hasPatch = true;
      } else if (edited.avatarUrlInput !== "") {
        patchBody.avatarUrl = edited.avatarUrlInput;
        hasPatch = true;
      }

      const originalRoleIds = new Set(
        catalog.filter((r) => original.roles.includes(r.name)).map((r) => r.id)
      );
      const toAssign = catalog.filter((r) => edited.stagedRoleIds.has(r.id) && !originalRoleIds.has(r.id));
      const toRevoke = catalog.filter((r) => !edited.stagedRoleIds.has(r.id) && originalRoleIds.has(r.id));

      let updatedUser: User = original;
      if (hasPatch) {
        updatedUser = await updateUser(userId, patchBody);
      }

      await Promise.all([
        ...toAssign.map((r) => assignRoleToUser(userId, r.name)),
        ...toRevoke.map((r) => revokeRoleFromUser(userId, r.id)),
      ]);

      return updatedUser;
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Error al guardar");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const removeUser = useCallback(async (userId: string): Promise<boolean> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      await deleteUser(userId);
      return true;
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Error al eliminar");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { isSaving, mutationError, clearError, saveUserDiff, removeUser };
}
