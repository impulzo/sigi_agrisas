"use client";

import { useState, useCallback } from "react";
import { createCustomer } from "../services/createCustomer";
import { updateCustomer } from "../services/updateCustomer";
import { softDeleteCustomer } from "../services/softDeleteCustomer";
import { CustomerCodeAlreadyInUseError, CustomerRfcAlreadyInUseError } from "../errors";
import type { CreateCustomerBody, UpdateCustomerBody } from "../types/api";
import type { Customer } from "../types/domain";

interface UseCustomerMutationsResult {
  isSaving: boolean;
  mutationError: string | null;
  clearError: () => void;
  /** Throws CustomerCodeAlreadyInUseError / CustomerRfcAlreadyInUseError so caller can map inline; other errors are captured in mutationError. */
  createOne: (body: CreateCustomerBody) => Promise<Customer | null>;
  /** Returns null if body is empty (no request). Throws CustomerRfcAlreadyInUseError. */
  updateOne: (id: string, body: UpdateCustomerBody) => Promise<Customer | null>;
  softDeleteOne: (id: string) => Promise<boolean>;
  reactivateOne: (id: string) => Promise<Customer | null>;
}

export function useCustomerMutations(): UseCustomerMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const createOne = useCallback(async (body: CreateCustomerBody): Promise<Customer | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      return await createCustomer({ body });
    } catch (err) {
      if (err instanceof CustomerCodeAlreadyInUseError || err instanceof CustomerRfcAlreadyInUseError) {
        throw err;
      }
      setMutationError((err as Error).message ?? "Error al crear cliente.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const updateOne = useCallback(async (id: string, body: UpdateCustomerBody): Promise<Customer | null> => {
    if (Object.keys(body).length === 0) return null;
    setIsSaving(true);
    setMutationError(null);
    try {
      return await updateCustomer({ id, body });
    } catch (err) {
      if (err instanceof CustomerRfcAlreadyInUseError) {
        throw err;
      }
      setMutationError((err as Error).message ?? "Error al actualizar cliente.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const softDeleteOne = useCallback(async (id: string): Promise<boolean> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      await softDeleteCustomer({ id });
      return true;
    } catch (err) {
      setMutationError((err as Error).message ?? "Error al desactivar cliente.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const reactivateOne = useCallback(
    async (id: string): Promise<Customer | null> => {
      return updateOne(id, { isActive: true });
    },
    [updateOne],
  );

  return { isSaving, mutationError, clearError, createOne, updateOne, softDeleteOne, reactivateOne };
}
