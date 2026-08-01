"use client";

import { useState, useCallback } from "react";
import { updateTicketSettings } from "../services/updateTicketSettings";
import type { TicketSettingsDto, UpdateTicketSettingsBody } from "../types/api";

interface UseTicketSettingsMutationsResult {
  isSaving: boolean;
  mutationError: Error | null;
  clearError: () => void;
  update: (body: UpdateTicketSettingsBody) => Promise<TicketSettingsDto | null>;
}

export function useTicketSettingsMutations(onChange?: (updated: TicketSettingsDto) => void): UseTicketSettingsMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const update = useCallback(async (body: UpdateTicketSettingsBody): Promise<TicketSettingsDto | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await updateTicketSettings(body);
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
