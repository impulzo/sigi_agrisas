"use client";

import { useState, useEffect, useCallback } from "react";
import { listRoles } from "../services/listRoles";
import type { Role } from "../types/domain";

interface UseRolesResult {
  roles: Role[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRoles(): UseRolesResult {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listRoles()
      .then((data) => {
        if (!cancelled) setRoles(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Error al cargar roles");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { roles, isLoading, error, refresh };
}
