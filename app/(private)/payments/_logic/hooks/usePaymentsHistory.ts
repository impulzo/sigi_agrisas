"use client";

import { useState, useEffect, useCallback } from "react";
import { getPaymentsHistory, downloadPaymentsHistoryPdf } from "../services";
import type { PaymentHistoryReportDto } from "../types/api";
import type { PaymentHistoryFilters } from "../types/domain";

interface UsePaymentsHistoryResult {
  report: PaymentHistoryReportDto | null;
  isLoading: boolean;
  error: Error | null;
  isExporting: boolean;
  exportError: Error | null;
  refresh: () => void;
  exportPdf: () => Promise<void>;
}

export function usePaymentsHistory(
  filters: PaymentHistoryFilters & { page?: number; pageSize?: number },
): UsePaymentsHistoryResult {
  const [report, setReport] = useState<PaymentHistoryReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const { page = 1, pageSize = 50, userId, customerId, productId, paymentMethodId, status, from, to, branchId } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getPaymentsHistory({ page, pageSize, userId, customerId, productId, paymentMethodId, status, from, to, branchId, signal: controller.signal })
      .then((data) => {
        setReport(data);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, userId, customerId, productId, paymentMethodId, status, from, to, branchId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const exportPdf = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await downloadPaymentsHistoryPdf({ userId, customerId, productId, paymentMethodId, status, from, to, branchId });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `payments-history-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExporting(false);
    }
  }, [userId, customerId, productId, paymentMethodId, status, from, to, branchId]);

  return { report, isLoading, error, isExporting, exportError, refresh, exportPdf };
}
