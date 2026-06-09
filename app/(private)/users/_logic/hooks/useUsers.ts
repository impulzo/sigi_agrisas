"use client";

import { useState, useEffect, useCallback } from "react";
import { listUsers } from "../services/listUsers";
import type { User } from "../types/domain";

interface UseUsersResult {
  users: User[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useUsers({ page, pageSize }: { page: number; pageSize: number }): UseUsersResult {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    listUsers({ page, pageSize })
      .then((data) => {
        if (!cancelled) {
          setUsers(data.users);
          setTotal(data.total);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message ?? "Error al cargar usuarios");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { users, total, isLoading, error, refresh };
}
