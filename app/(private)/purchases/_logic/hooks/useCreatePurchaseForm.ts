"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createPurchase } from "../services";
import { computePurchaseTotalsClient, PurchaseTotalsResult } from "../lib/computePurchaseTotalsClient";
import type { NewProviderInput, ProviderDto, ProductDto } from "../types/api";
import type { PurchaseDetail } from "../types/domain";
import type { SatApplyResult } from "../lib/satInvoiceMapping";

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
  lotNumber: string;
  expirationDate: string;
  manufactureDate: string;
  lineSubtotal: number;
  lineTotal: number;
}

export interface SatMetadataState {
  satUuid: string | null;
  supplierInvoiceNumber: string | null;
  invoiceDate: string;
  purchasedAt: string;
  xmlFileName: string | null;
}

interface UseCreatePurchaseFormResult {
  providerId: string;
  provider: ProviderDto | null;
  newProvider: NewProviderInput | null;
  setProvider: (id: string, provider: ProviderDto | null) => void;
  branchId: string;
  paymentMethodId: string;
  setPaymentMethodId: (id: string) => void;
  isCredit: boolean;
  notes: string;
  setNotes: (v: string) => void;
  lines: PurchaseFormLine[];
  addLine: (product: ProductDto) => void;
  setLinesFromSat: (lines: { product: ProductDto; quantity: number; unitCost: number }[]) => void;
  applySatResult: (result: SatApplyResult) => void;
  clearSat: () => void;
  updateQuantity: (id: string, qty: number) => void;
  updateUnitCost: (id: string, cost: number) => void;
  updateDiscount: (id: string, pct: number) => void;
  updateLot: (id: string, lotNumber: string) => void;
  updateExpiration: (id: string, expirationDate: string) => void;
  updateManufactureDate: (id: string, manufactureDate: string) => void;
  removeLine: (id: string) => void;
  totals: PurchaseTotalsResult;
  satMetadata: SatMetadataState;
  setSatMetadata: (meta: Partial<SatMetadataState>) => void;
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
  const [newProvider, setNewProvider] = useState<NewProviderInput | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<PurchaseFormLine[]>([]);
  const [satMetadata, setSatMetadataState] = useState<SatMetadataState>({
    satUuid: null,
    supplierInvoiceNumber: null,
    invoiceDate: "",
    purchasedAt: "",
    xmlFileName: null,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<Error | null>(null);

  const isCredit = paymentMethodId ? isCreditByPaymentMethod(paymentMethodId) : false;

  const setProvider = useCallback((id: string, p: ProviderDto | null) => {
    setProviderId(id);
    setProviderState(p);
    setNewProvider(null);
  }, []);

  const setSatMetadata = useCallback((meta: Partial<SatMetadataState>) => {
    setSatMetadataState((prev) => ({ ...prev, ...meta }));
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
          lotNumber: "",
          expirationDate: "",
          manufactureDate: "",
          lineSubtotal: 0,
          lineTotal: 0,
        },
      ];
    });
  }, []);

  const setLinesFromSat = useCallback((satLines: { product: ProductDto; quantity: number; unitCost: number }[]) => {
    setLines(
      satLines.map((l) => ({
        id: l.product.id,
        productId: l.product.id,
        productCode: l.product.code,
        productName: l.product.name,
        ivaRate: l.product.ivaRate ?? 0,
        iepsRate: l.product.iepsRate ?? 0,
        quantity: l.quantity,
        unitCost: l.unitCost,
        discountPct: 0,
        lotNumber: "",
        expirationDate: "",
        manufactureDate: "",
        lineSubtotal: 0,
        lineTotal: 0,
      }))
    );
  }, []);

  const applySatResult = useCallback((result: SatApplyResult) => {
    setProviderId("");
    setProviderState(null);
    setNewProvider(result.newProvider);
    if (result.paymentMethodId) setPaymentMethodId(result.paymentMethodId);
    setLinesFromSat(result.lines);
    setSatMetadataState({
      satUuid: result.metadata.satUuid,
      supplierInvoiceNumber: result.metadata.supplierInvoiceNumber,
      invoiceDate: result.metadata.invoiceDate,
      purchasedAt: result.metadata.purchasedAt,
      xmlFileName: result.metadata.xmlFileName,
    });
  }, [setLinesFromSat]);

  const clearSat = useCallback(() => {
    setNewProvider(null);
    setSatMetadataState({
      satUuid: null,
      supplierInvoiceNumber: null,
      invoiceDate: "",
      purchasedAt: "",
      xmlFileName: null,
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

  const updateLot = useCallback((id: string, lotNumber: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, lotNumber } : l)));
  }, []);

  const updateExpiration = useCallback((id: string, expirationDate: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, expirationDate } : l)));
  }, []);

  const updateManufactureDate = useCallback((id: string, manufactureDate: string) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, manufactureDate } : l)));
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

  const canSubmit =
    Boolean(providerId || newProvider) && Boolean(paymentMethodId) && lines.length > 0 && !isSubmitting;

  const clearSubmitError = useCallback(() => setSubmitError(null), []);

  const submit = useCallback(async (): Promise<PurchaseDetail | null> => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createPurchase({
        ...(newProvider ? { newProvider } : { providerId }),
        branchId,
        paymentMethodId,
        notes: notes.trim() || null,
        purchasedAt: satMetadata.purchasedAt || undefined,
        satUuid: satMetadata.satUuid,
        supplierInvoiceNumber: satMetadata.supplierInvoiceNumber,
        invoiceDate: satMetadata.invoiceDate || null,
        xmlFileName: satMetadata.xmlFileName,
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitCost: l.unitCost,
          discountPct: l.discountPct || null,
          lotNumber: l.lotNumber.trim() || null,
          expirationDate: l.expirationDate || null,
          manufactureDate: l.manufactureDate || null,
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
  }, [providerId, newProvider, branchId, paymentMethodId, notes, satMetadata, lines, router]);

  return {
    providerId,
    provider,
    newProvider,
    setProvider,
    branchId,
    paymentMethodId,
    setPaymentMethodId,
    isCredit,
    notes,
    setNotes,
    lines: linesWithTotals,
    addLine,
    setLinesFromSat,
    applySatResult,
    clearSat,
    updateQuantity,
    updateUnitCost,
    updateDiscount,
    updateLot,
    updateExpiration,
    updateManufactureDate,
    removeLine,
    totals,
    satMetadata,
    setSatMetadata,
    isSubmitting,
    submitError,
    clearSubmitError,
    canSubmit,
    submit,
  };
}
