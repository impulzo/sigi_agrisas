"use client";

import { useState, useCallback } from "react";
import { updatePricingSettings } from "../services/updatePricingSettings";
import type { PricingSettingsDto, UpdatePricingSettingsBody } from "../types/api";

interface UsePricingSettingsMutationsResult {
  isSaving: boolean;
  mutationError: Error | null;
  clearError: () => void;
  update: (body: UpdatePricingSettingsBody) => Promise<PricingSettingsDto | null>;
}

export function usePricingSettingsMutations(onChange?: (updated: PricingSettingsDto) => void): UsePricingSettingsMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const update = useCallback(async (body: UpdatePricingSettingsBody): Promise<PricingSettingsDto | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await updatePricingSettings(body);
      onChange?.(result);
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onChange]);

  return { isSaving, mutationError, clearError, update };
}
