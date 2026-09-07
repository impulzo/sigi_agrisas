"use client";

import { useState, useEffect, useCallback } from "react";
import { getOwnProfile } from "../services/getOwnProfile";
import type { OwnProfileDto } from "../types/api";

interface UseOwnProfileResult {
  profile: OwnProfileDto | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

export function useOwnProfile(): UseOwnProfileResult {
  const [profile, setProfile] = useState<OwnProfileDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getOwnProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return { profile, isLoading, error, refresh };
}
