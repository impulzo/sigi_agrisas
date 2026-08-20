"use client";

import { useState, useCallback } from "react";
import { createVehicle } from "../services/createVehicle";
import { updateVehicle } from "../services/updateVehicle";
import { VehicleCodeAlreadyInUseError } from "../errors";
import type { CreateVehicleBody, UpdateVehicleBody } from "../types/api";
import type { Vehicle } from "../types/domain";

interface UseVehicleMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  /** Throws VehicleCodeAlreadyInUseError so caller can map inline; other errors are captured in mutationError. */
  createOne: (body: CreateVehicleBody) => Promise<Vehicle | null>;
  updateOne: (id: string, body: UpdateVehicleBody) => Promise<Vehicle | null>;
  /** No DELETE endpoint exists for this catalog — soft delete is PATCH {isActive:false}. */
  softDeleteOne: (id: string) => Promise<boolean>;
  reactivateOne: (id: string) => Promise<Vehicle | null>;
}

export function useVehicleMutations(): UseVehicleMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreateVehicleBody): Promise<Vehicle | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await createVehicle({ body });
    } catch (err) {
      if (err instanceof VehicleCodeAlreadyInUseError) throw err;
      setMutationError((err as Error).message ?? "Error al crear vehículo.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdateVehicleBody): Promise<Vehicle | null> => {
    if (Object.keys(body).length === 0) return null;
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updateVehicle({ id, body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al actualizar vehículo.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const softDeleteOne = useCallback(
    async (id: string): Promise<boolean> => {
      const result = await updateOne(id, { isActive: false });
      return result !== null;
    },
    [updateOne]
  );

  const reactivateOne = useCallback(
    async (id: string): Promise<Vehicle | null> => {
      return updateOne(id, { isActive: true });
    },
    [updateOne]
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
