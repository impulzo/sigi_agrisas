"use client";

import { useState, useCallback } from "react";
import { cancelInvoice, downloadInvoiceFile } from "../services";
import type { Invoice } from "../types/domain";
import type { CancellationMotive } from "../types/domain";

interface UseInvoiceMutationsResult {
  isSaving: boolean;
  isDownloading: boolean;
  mutationError: Error | null;
  clearError: () => void;
  cancel: (id: string, motive: CancellationMotive, uuidReplacement?: string | null) => Promise<Invoice | null>;
  download: (id: string, format: "pdf" | "xml") => Promise<void>;
}

export function useInvoiceMutations(onChange?: (updated: Invoice) => void): UseInvoiceMutationsResult {
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mutationError, setMutationError] = useState<Error | null>(null);

  const clearError = useCallback(() => setMutationError(null), []);

  const cancel = useCallback(async (
    id: string,
    motive: CancellationMotive,
    uuidReplacement?: string | null,
  ): Promise<Invoice | null> => {
    setIsSaving(true);
    setMutationError(null);
    try {
      const result = await cancelInvoice(id, { motive, uuidReplacement });
      onChange?.(result);
      return result;
    } catch (err) {
      setMutationError(err as Error);
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [onChange]);

  const download = useCallback(async (id: string, format: "pdf" | "xml"): Promise<void> => {
    setIsDownloading(true);
    setMutationError(null);
    try {
      await downloadInvoiceFile(id, format);
    } catch (err) {
      setMutationError(err as Error);
    } finally {
      setIsDownloading(false);
    }
  }, []);

  return { isSaving, isDownloading, mutationError, clearError, cancel, download };
}
