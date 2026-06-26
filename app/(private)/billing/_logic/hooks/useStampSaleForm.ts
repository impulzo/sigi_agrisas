"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { stampInvoice } from "../services";
import type { Invoice } from "../types/domain";

interface StampSaleFormState {
  saleId: string;
  saleLabel: string;
  paymentForm: string;
  paymentMethod: string;
  cfdiUse: string;
}

interface UseStampSaleFormResult {
  form: StampSaleFormState;
  setField: <K extends keyof StampSaleFormState>(key: K, value: StampSaleFormState[K]) => void;
  isSubmitting: boolean;
  error: Error | null;
  clearError: () => void;
  submit: () => Promise<Invoice | null>;
}

const DEFAULT: StampSaleFormState = {
  saleId: "",
  saleLabel: "",
  paymentForm: "03",
  paymentMethod: "PUE",
  cfdiUse: "G03",
};

export function useStampSaleForm(initialSaleId?: string, initialSaleLabel?: string): UseStampSaleFormResult {
  const router = useRouter();
  const [form, setForm] = useState<StampSaleFormState>({
    ...DEFAULT,
    saleId: initialSaleId ?? "",
    saleLabel: initialSaleLabel ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const setField = useCallback(<K extends keyof StampSaleFormState>(key: K, value: StampSaleFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(async (): Promise<Invoice | null> => {
    if (!form.saleId) {
      setError(new Error("Selecciona una venta"));
      return null;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const invoice = await stampInvoice({
        saleId: form.saleId,
        ...(form.paymentForm && { paymentForm: form.paymentForm }),
        ...(form.paymentMethod && { paymentMethod: form.paymentMethod }),
        ...(form.cfdiUse && { cfdiUse: form.cfdiUse }),
      });
      router.push(`/billing/${invoice.id}`);
      return invoice;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [form, router]);

  return { form, setField, isSubmitting, error, clearError, submit };
}
