"use client";

import { useState, useCallback } from "react";
import { grantPermissionToRole } from "../services/grantPermissionToRole";
import type { Permission } from "../types/domain";

interface GrantOptions {
  onOptimistic?: () => void;
  onError?: (err: Error) => void;
}

interface UseGrantPermissionResult {
  mutate: (roleId: string, permission: Permission, options?: GrantOptions) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useGrantPermission(): UseGrantPermissionResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (
    roleId: string,
    permission: Permission,
    options?: GrantOptions
  ) => {
    setIsLoading(true);
    setError(null);
    options?.onOptimistic?.();
    try {
      await grantPermissionToRole(roleId, permission.key);
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
