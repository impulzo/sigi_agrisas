"use client";

import { useState, useCallback } from "react";
import { getInvoicePreviewSource } from "../services/getInvoicePreviewSource";
import { buildInvoicePreview } from "../lib/buildInvoicePreview";
import type { InvoicePreviewData } from "../types/preview";

interface UseInvoicePreviewResult {
  data: InvoicePreviewData | null;
  isLoading: boolean;
  error: Error | null;
  load: (saleId: string, opts: { paymentForm: string; paymentMethod: string }) => Promise<void>;
  reset: () => void;
}

export function useInvoicePreview(): UseInvoicePreviewResult {
  const [data, setData] = useState<InvoicePreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (saleId: string, opts: { paymentForm: string; paymentMethod: string }) => {
    setIsLoading(true);
    setError(null);
    setData(null);
    try {
      const source = await getInvoicePreviewSource(saleId);
      const preview = buildInvoicePreview({
        issuer: { name: "Agrisas", branchName: source.sale.branchName },
        receiver: {
          rfc: source.customer.rfc,
          name: source.customer.name,
          cfdiUse: source.customer.cfdiUse ?? "",
          fiscalRegime: source.customer.taxRegime ?? "",
          taxZipCode: source.customer.taxZipCode ?? "",
        },
        lines: source.sale.items.map((item) => ({
          description: item.productNameSnapshot,
          productCode: item.productCodeSnapshot,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPct: item.discountPct,
          ivaRate: item.ivaRate,
          iepsRate: item.iepsRate,
        })),
        paymentForm: opts.paymentForm,
        paymentMethod: opts.paymentMethod,
      });
      setData(preview);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { data, isLoading, error, load, reset };
}
