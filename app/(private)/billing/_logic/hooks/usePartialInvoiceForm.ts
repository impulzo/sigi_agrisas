"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { stampInvoice } from "../services";
import { computeInvoiceTotalsClient } from "../lib/computeInvoiceTotalsClient";
import type { PartialLine, Invoice } from "../types/domain";

interface CustomerFiscal {
  rfc: string;
  name: string;
  cfdiUse: string;
  fiscalRegime: string;
  taxZipCode: string;
}

interface UsePartialInvoiceFormResult {
  customer: CustomerFiscal | null;
  setCustomer: (c: CustomerFiscal | null) => void;
  fiscalMissingFields: string[];
  lines: PartialLine[];
  addLine: (line: Omit<PartialLine, "_key">) => void;
  updateLine: (key: string, patch: Partial<PartialLine>) => void;
  removeLine: (key: string) => void;
  paymentForm: string;
  setPaymentForm: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  totals: ReturnType<typeof computeInvoiceTotalsClient>;
  isSubmitting: boolean;
  error: Error | null;
  clearError: () => void;
  submit: () => Promise<Invoice | null>;
}

let keyCounter = 0;
function nextKey() { return `line-${++keyCounter}`; }

function missingFiscalFields(c: CustomerFiscal | null): string[] {
  if (!c) return ["receptor"];
  const missing: string[] = [];
  if (!c.rfc.trim()) missing.push("RFC");
  if (!c.cfdiUse.trim()) missing.push("Uso CFDI");
  if (!c.fiscalRegime.trim()) missing.push("Régimen fiscal");
  if (!c.taxZipCode.trim()) missing.push("CP fiscal");
  return missing;
}

export function usePartialInvoiceForm(): UsePartialInvoiceFormResult {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerFiscal | null>(null);
  const [lines, setLines] = useState<PartialLine[]>([]);
  const [paymentForm, setPaymentForm] = useState("03");
  const [paymentMethod, setPaymentMethod] = useState("PUE");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fiscalMissingFields = useMemo(() => missingFiscalFields(customer), [customer]);

  const totals = useMemo(() => computeInvoiceTotalsClient(lines.map((l) => ({
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    ivaRate: l.ivaRate,
    iepsRate: l.iepsRate,
  }))), [lines]);

  const addLine = useCallback((line: Omit<PartialLine, "_key">) => {
    setLines((prev) => [...prev, { ...line, _key: nextKey() }]);
  }, []);

  const updateLine = useCallback((key: string, patch: Partial<PartialLine>) => {
    setLines((prev) => prev.map((l) => l._key === key ? { ...l, ...patch } : l));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l._key !== key));
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const submit = useCallback(async (): Promise<Invoice | null> => {
    if (!customer || fiscalMissingFields.length > 0) {
      setError(new Error(`Datos fiscales incompletos: ${fiscalMissingFields.join(", ")}`));
      return null;
    }
    if (lines.length === 0) {
      setError(new Error("Agrega al menos una línea"));
      return null;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const invoice = await stampInvoice({
        customer: {
          rfc: customer.rfc,
          name: customer.name,
          cfdiUse: customer.cfdiUse,
          fiscalRegime: customer.fiscalRegime,
          taxZipCode: customer.taxZipCode,
        },
        items: lines.map((l) => ({
          productId: l.productId,
          productCode: l.productCode,
          description: l.description,
          satProductCode: l.satProductCode || null,
          satUnitCode: l.satUnitCode || null,
          unit: l.unit || undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: l.discountPct || null,
          ivaRate: l.ivaRate || null,
          iepsRate: l.iepsRate || null,
        })),
        paymentForm: paymentForm || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      router.push(`/billing/${invoice.id}`);
      return invoice;
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [customer, fiscalMissingFields, lines, paymentForm, paymentMethod, router]);

  return {
    customer,
    setCustomer,
    fiscalMissingFields,
    lines,
    addLine,
    updateLine,
    removeLine,
    paymentForm,
    setPaymentForm,
    paymentMethod,
    setPaymentMethod,
    totals,
    isSubmitting,
    error,
    clearError,
    submit,
  };
}
