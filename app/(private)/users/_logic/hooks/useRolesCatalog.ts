"use client";

import { useState, useEffect } from "react";
import { listAvailableRoles } from "../services/listAvailableRoles";
import type { RoleOption } from "../services/listAvailableRoles";

interface UseRolesCatalogResult {
  roles: RoleOption[];
  isLoading: boolean;
  error: string | null;
}

export function useRolesCatalog(): UseRolesCatalogResult {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listAvailableRoles()
      .then((data) => {
        if (!cancelled) setRoles(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Error al cargar roles");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { roles, isLoading, error };
}
