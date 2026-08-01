"use client";

import { useState, useCallback } from "react";
import { cancelWaybill, downloadWaybillFile } from "../services";
import type { WaybillDetail } from "../types/domain";
import type { CancelWaybillRequest } from "../types/api";

interface UseWaybillMutationsResult {
  isSaving: boolean;
  isDownloading: boolean;
  mutationError: Error | null;
  clearError: () => void;
  cancel: (id: string, body: CancelWaybillRequest) => Promise<WaybillDetail | null>;
  download: (id: string, format: "pdf" | "xml") => Promise<void>;
}

export function useWaybillMutations(onChange?: (updated: WaybillDetail) => void): UseWaybillMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const cancel = useCallback(
    async (id: string, body: CancelWaybillRequest): Promise<WaybillDetail | null> => {
      setIsSaving(true);
      setMutationError(null);
      try {
        const result = await cancelWaybill(id, body);
        onChange?.(result);
        return result;
      } catch (err) {
        setMutationError(err as Error);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [onChange]
  );

  const download = useCallback(async (id: string, format: "pdf" | "xml"): Promise<void> => {
    setIsDownloading(true);
    setMutationError(null);
    try {
      await downloadWaybillFile(id, format);
    } catch (err) {
      setMutationError(err as Error);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { isSaving, isDownloading, mutationError, clearError, cancel, download };
}
