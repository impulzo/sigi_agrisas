"use client";

import { useState, useCallback } from "react";
import { createSale } from "../services/createSale";
import type { SaleDetailDto, CreateSaleBody } from "../types/api";
import type { CartLine } from "../types/domain";

type SubmitStatus = "idle" | "submitting" | "succeeded" | "failed";

interface UseSaleSubmissionResult {
  status: SubmitStatus;
  sale: SaleDetailDto | null;
  error: Error | null;
  submit: (draft: {
    branchId: string;
    customerId?: string;
    folioId: string;
    paymentMethodId: string;
    lines: CartLine[];
    notes?: string;
  }) => Promise<void>;
  reset: () => void;
}

export function useSaleSubmission(): UseSaleSubmissionResult {
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [sale, setSale] = useState<SaleDetailDto | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(async (draft: {
    branchId: string;
    customerId?: string;
    folioId: string;
    paymentMethodId: string;
    lines: CartLine[];
    notes?: string;
  }) => {
    setStatus("submitting");
    setError(null);

    const body: CreateSaleBody = {
      branchId: draft.branchId,
      customerId: draft.customerId,
      folioId: draft.folioId,
      paymentMethodId: draft.paymentMethodId,
      notes: draft.notes,
      items: draft.lines.map((l) => ({
        productId: l.productId,
        productPriceId: l.productPriceId,
        quantity: l.quantity,
        discountPctOverride: l.discountPct > 0 ? l.discountPct : undefined,
      })),
    };

    try {
      const result = await createSale(body);
      setSale(result);
      setStatus("succeeded");
    } catch (err) {
      setError(err as Error);
      setStatus("failed");
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setSale(null);
    setError(null);
  }, []);

  return { status, sale, error, submit, reset };
}
