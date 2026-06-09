"use client";

import { useState, useCallback } from "react";
import { createQuote } from "../services/createQuote";
import type { CreateQuoteBody } from "../types/api";
import type { QuoteDetail } from "../types/domain";
import type { CartLine } from "../../../pos/_logic/types/domain";

type SubmitStatus = "idle" | "submitting" | "succeeded" | "failed";

interface UseQuoteSubmissionResult {
  status: SubmitStatus;
  quote: QuoteDetail | null;
  error: Error | null;
  submit: (draft: {
    branchId: string;
    customerId?: string | null;
    folioId: string;
    lines: CartLine[];
    expiresAt?: string | null;
    notes?: string | null;
  }) => Promise<void>;
  reset: () => void;
}

export function useQuoteSubmission(): UseQuoteSubmissionResult {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(async (draft: {
    branchId: string;
    customerId?: string | null;
    folioId: string;
    lines: CartLine[];
    expiresAt?: string | null;
    notes?: string | null;
  }) => {
    setStatus("submitting");
    setError(null);

    const body: CreateQuoteBody = {
      branchId: draft.branchId,
      customerId: draft.customerId ?? null,
      folioId: draft.folioId,
      expiresAt: draft.expiresAt ?? null,
      notes: draft.notes ?? null,
      items: draft.lines.map((l) => ({
        productId: l.productId,
        productPriceId: l.productPriceId,
        quantity: l.quantity,
        discountPctOverride: l.discountPct > 0 ? l.discountPct : undefined,
      })),
    };

    try {
      const result = await createQuote(body);
      setQuote(result);
      setStatus("succeeded");
    } catch (err) {
      setError(err as Error);
      setStatus("failed");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setQuote(null);
    setError(null);
  }, []);

  return { status, quote, error, submit, reset };
}
