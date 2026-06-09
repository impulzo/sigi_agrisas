"use client";

import { useState, useCallback } from "react";
import { createPaymentMethod } from "../services/createPaymentMethod";
import { updatePaymentMethod } from "../services/updatePaymentMethod";
import { softDeletePaymentMethod } from "../services/softDeletePaymentMethod";
import type { CreatePaymentMethodBody, UpdatePaymentMethodBody } from "../types/api";
import type { PaymentMethod } from "../types/domain";

interface UsePaymentMethodMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  createOne: (body: CreatePaymentMethodBody) => Promise<PaymentMethod | null>;
  updateOne: (id: string, body: UpdatePaymentMethodBody) => Promise<PaymentMethod | null>;
  softDeleteOne: (id: string) => Promise<boolean>;
  reactivateOne: (id: string) => Promise<PaymentMethod | null>;
}

export function usePaymentMethodMutations(): UsePaymentMethodMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreatePaymentMethodBody): Promise<PaymentMethod | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await createPaymentMethod({ body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al crear");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdatePaymentMethodBody): Promise<PaymentMethod | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updatePaymentMethod({ id, body });
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al actualizar");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const softDeleteOne = useCallback(async (id: string): Promise<boolean> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      await softDeletePaymentMethod({ id });
      return true;
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al eliminar");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const reactivateOne = useCallback(
    async (id: string): Promise<PaymentMethod | null> => {
      return updateOne(id, { isActive: true });
    },
    [updateOne],
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
