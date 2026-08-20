"use client";

import { useState, useEffect, useCallback } from "react";
import { authFetch } from "../_lib/authFetch";

export interface VehicleOption {
  id: string;
  code: string;
  plate: string;
  vehicleConfig: string;
  permitType: string;
  permitNumber: string;
  insuranceCompany: string;
  insurancePolicy: string;
}

interface CacheEntry {
  options: VehicleOption[];
  expiresAt: number;
  promise?: Promise<VehicleOption[]>;
}

const CACHE_TTL_MS = 60_000;
let cache: CacheEntry | null = null;

async function fetchVehicles(): Promise<VehicleOption[]> {
  if (cache && Date.now() < cache.expiresAt) return cache.options;
  if (cache?.promise) return cache.promise;

  const promise = authFetch("/api/v1/admin/vehicles?pageSize=100&includeInactive=false")
    .then((res) => res.json())
    .then((body: { items: Array<Record<string, unknown>> }) => {
      const options: VehicleOption[] = body.items.map((v) => ({
        id: v.id as string,
        code: v.code as string,
        plate: v.plate as string,
        vehicleConfig: v.vehicleConfig as string,
        permitType: v.permitType as string,
        permitNumber: v.permitNumber as string,
        insuranceCompany: v.insuranceCompany as string,
        insurancePolicy: v.insurancePolicy as string,
      }));
      cache = { options, expiresAt: Date.now() + CACHE_TTL_MS };
      return options;
    })
    .catch(() => {
      cache = null;
      return [] as VehicleOption[];
    });

  cache = { options: [], expiresAt: 0, promise };
  return promise;
}

interface UseVehiclesOptionsResult {
  options: VehicleOption[];
  isLoading: boolean;
  refresh: () => void;
}

export function useVehiclesOptions(): UseVehiclesOptionsResult {
  const [options, setOptions] = useState<VehicleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    fetchVehicles().then((opts) => {
      if (!cancelled) {
        setOptions(opts);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return load();
  }, [load]);

  const refresh = useCallback(() => {
    cache = null;
    load();
  }, [load]);

  return { options, isLoading, refresh };
}
