"use client";

import { useState, useEffect, useCallback } from "react";
import { listRolePermissions } from "../services/listRolePermissions";
import type { Permission } from "../types/domain";

interface UseRolePermissionsResult {
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  setPermissions: React.Dispatch<React.SetStateAction<Permission[]>>;
}

export function useRolePermissions(roleId: string | null): UseRolePermissionsResult {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!roleId) {
      setPermissions([]);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listRolePermissions(roleId)
      .then((data) => {
        if (!cancelled) setPermissions(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Error al cargar permisos del rol");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [roleId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { permissions, isLoading, error, refresh, setPermissions };
}
