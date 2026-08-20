"use client";

import { useState, useCallback } from "react";
import { updateInventoryNotificationSettings } from "../services/updateInventoryNotificationSettings";
import type { InventoryNotificationSettingsDto, UpdateInventoryNotificationSettingsBody } from "../types/api";

interface UseInventoryNotificationSettingsMutationsResult {
  isSaving: boolean;
  mutationError: Error | null;
  clearError: () => void;
  update: (body: UpdateInventoryNotificationSettingsBody) => Promise<InventoryNotificationSettingsDto | null>;
}

export function useInventoryNotificationSettingsMutations(
  onChange?: (updated: InventoryNotificationSettingsDto) => void,
): UseInventoryNotificationSettingsMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const update = useCallback(async (body: UpdateInventoryNotificationSettingsBody): Promise<InventoryNotificationSettingsDto | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await updateInventoryNotificationSettings(body);
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
