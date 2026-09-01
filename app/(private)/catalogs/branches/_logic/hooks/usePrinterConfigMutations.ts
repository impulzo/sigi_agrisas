"use client";

import { useState, useCallback } from "react";
import { updatePrinterConfig } from "../services/updatePrinterConfig";
import type { UpdatePrinterConfigBody, PrinterConfigDto } from "../types/api";

interface UsePrinterConfigMutationsResult {
  isSaving: boolean;
  mutationError: Error | null;
  clearError: () => void;
  save: (branchId: string, body: UpdatePrinterConfigBody) => Promise<PrinterConfigDto | null>;
}

export function usePrinterConfigMutations(onSaved?: (updated: PrinterConfigDto) => void): UsePrinterConfigMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const save = useCallback(
    async (branchId: string, body: UpdatePrinterConfigBody): Promise<PrinterConfigDto | null> => {
      setIsSaving(true);
      setMutationError(null);
      try {
        const result = await updatePrinterConfig({ id: branchId, body });
        onSaved?.(result);
        return result;
      } catch (err) {
        setMutationError(err as Error);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [onSaved],
  );

  return { isSaving, mutationError, clearError, save };
}
