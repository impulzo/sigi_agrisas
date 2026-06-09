"use client";

import { useState, useCallback } from "react";
import { revokePermissionFromRole } from "../services/revokePermissionFromRole";
import type { Permission } from "../types/domain";

interface RevokeOptions {
  onOptimistic?: () => void;
  onError?: (err: Error) => void;
}

interface UseRevokePermissionResult {
  mutate: (roleId: string, permission: Permission, options?: RevokeOptions) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useRevokePermission(): UseRevokePermissionResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (
    roleId: string,
    permission: Permission,
    options?: RevokeOptions
  ) => {
    setIsLoading(true);
    setError(null);
    options?.onOptimistic?.();
    try {
      await revokePermissionFromRole(roleId, permission.id);
    } catch (err) {
      const e = err as Error;
      setError(e.message);
      options?.onError?.(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}
