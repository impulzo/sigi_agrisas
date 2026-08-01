"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPurchase } from "../services";
import { computePurchaseTotalsClient, PurchaseTotalsResult } from "../lib/computePurchaseTotalsClient";
import type { ProviderDto, ProductDto } from "../types/api";
import type { PurchaseDetail } from "../types/domain";

export interface PurchaseFormLine {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  ivaRate: number;
  iepsRate: number;
  quantity: number;
  unitCost: number;
  discountPct: number;
  lineSubtotal: number;
  lineTotal: number;
}

interface UseCreatePurchaseFormResult {
  providerId: string;
  provider: ProviderDto | null;
  setProvider: (id: string, provider: ProviderDto | null) => void;
  branchId: string;
  paymentMethodId: string;
  setPaymentMethodId: (id: string) => void;
  isCredit: boolean;
  notes: string;
  setNotes: (v: string) => void;
  lines: PurchaseFormLine[];
  addLine: (product: ProductDto) => void;
  updateQuantity: (id: string, qty: number) => void;
  updateUnitCost: (id: string, cost: number) => void;
  updateDiscount: (id: string, pct: number) => void;
  removeLine: (id: string) => void;
  totals: PurchaseTotalsResult;
  isSubmitting: boolean;
  submitError: Error | null;
  clearSubmitError: () => void;
  canSubmit: boolean;
  submit: () => Promise<PurchaseDetail | null>;
}

export function useCreatePurchaseForm(branchId: string, isCreditByPaymentMethod: (id: string) => boolean): UseCreatePurchaseFormResult {
  const router = useRouter();
  const [providerId, setProviderId] = useState("");
  const [provider, setProviderState] = useState<ProviderDto | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseFormLine[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  const isCredit = paymentMethodId ? isCreditByPaymentMethod(paymentMethodId) : false;

  const setProvider = useCallback((id: string, p: ProviderDto | null) => {
    setProviderId(id);
    setProviderState(p);
  }, []);

  const addLine = useCallback((product: ProductDto) => {
    setLines((prev) => {
      if (prev.some((l) => l.productId === product.id)) return prev;
      return [
        ...prev,
        {
          id: product.id,
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          ivaRate: product.ivaRate ?? 0,
          iepsRate: product.iepsRate ?? 0,
          quantity: 1,
          unitCost: 0,
          discountPct: 0,
          lineSubtotal: 0,
          lineTotal: 0,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((id: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, quantity: qty } : l)));
  }, []);

  const updateUnitCost = useCallback((id: string, cost: number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, unitCost: cost } : l)));
  }, []);

  const updateDiscount = useCallback((id: string, pct: number) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, discountPct: pct } : l)));
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const totals = useMemo(
    () =>
      computePurchaseTotalsClient(
        lines.map((l) => ({
          quantity: l.quantity,
          unitCost: l.unitCost,
          discountPct: l.discountPct,
          ivaRate: l.ivaRate,
          iepsRate: l.iepsRate,
        }))
      ),
    [lines]
  );

  const linesWithTotals = useMemo(
    () =>
      lines.map((l, i) => ({
        ...l,
        lineSubtotal: totals.lines[i]?.lineSubtotal ?? 0,
        lineTotal: totals.lines[i]?.lineTotal ?? 0,
      })),
    [lines, totals]
  );

  const canSubmit = Boolean(providerId) && Boolean(paymentMethodId) && lines.length > 0 && !isSubmitting;

  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  const submit = useCallback(async (): Promise<PurchaseDetail | null> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createPurchase({
        providerId,
        branchId,
        paymentMethodId,
        notes: notes.trim() || null,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCost: l.unitCost,
          discountPct: l.discountPct || null,
        })),
      });
      router.push(`/purchases/${result.id}`);
      return result;
    } catch (err) {
      setSubmitError(err as Error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [providerId, branchId, paymentMethodId, notes, lines, router]);

  return {
    providerId,
    provider,
    setProvider,
    branchId,
    paymentMethodId,
    setPaymentMethodId,
    isCredit,
    notes,
    setNotes,
    lines: linesWithTotals,
    addLine,
    updateQuantity,
    updateUnitCost,
    updateDiscount,
    removeLine,
    totals,
    isSubmitting,
    submitError,
    clearSubmitError,
    canSubmit,
    submit,
  };
}
