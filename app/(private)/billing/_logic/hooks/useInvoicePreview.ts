"use client";

import { useState, useCallback } from "react";
import { getInvoicePreviewSource } from "../services/getInvoicePreviewSource";
import { getEmitterFiscalSettings } from "../services/getEmitterFiscalSettings";
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
      const [source, emitterFiscal] = await Promise.all([
        getInvoicePreviewSource(saleId),
        getEmitterFiscalSettings().catch(() => ({ rfc: null, legalName: null, fiscalRegime: null, zipCode: null, address: null })),
      ]);
      const preview = buildInvoicePreview({
        issuer: {
          name: emitterFiscal.legalName,
          branchName: source.sale.branchName,
          rfc: emitterFiscal.rfc,
          fiscalRegime: emitterFiscal.fiscalRegime,
          zipCode: emitterFiscal.zipCode,
          address: emitterFiscal.address,
        },
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
          satProductCode: item.satProductCode,
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
