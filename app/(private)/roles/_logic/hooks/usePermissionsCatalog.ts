"use client";

import { useState, useEffect } from "react";
import { listPermissions } from "../services/listPermissions";
import type { Permission } from "../types/domain";

interface UsePermissionsCatalogResult {
  permissions: Permission[];
  isLoading: boolean;
  error: string | null;
}

export function usePermissionsCatalog(): UsePermissionsCatalogResult {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listPermissions()
      .then((data) => {
        if (!cancelled) setPermissions(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Error al cargar permisos");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { permissions, isLoading, error };
}
