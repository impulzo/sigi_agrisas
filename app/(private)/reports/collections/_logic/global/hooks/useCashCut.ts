"use client";

import { useState, useEffect, useCallback } from "react";
import { getCashCut, downloadCashCutPdf, downloadCashCutXlsx } from "../services";
import type { CashCutReportDto } from "../types/api";
import type { CashCutFilters } from "../types/domain";

interface Result {
  report: CashCutReportDto | null;
  isLoading: boolean;
  error: Error | null;
  isExportingPdf: boolean;
  isExportingXlsx: boolean;
  exportError: Error | null;
  refresh: () => void;
  exportPdf: () => Promise<void>;
  exportXlsx: () => Promise<void>;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useCashCut(filters: CashCutFilters): Result {
  const [report, setReport] = useState<CashCutReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [exportError, setExportError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const { from, to, branchId, customerId, paymentMethodId } = filters;

  useEffect(() => {
    if (!from || !to) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getCashCut({ from, to, branchId, customerId, paymentMethodId, signal: controller.signal })
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
  }, [from, to, branchId, customerId, paymentMethodId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const exportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    setExportError(null);
    try {
      const blob = await downloadCashCutPdf({ from, to, branchId, customerId, paymentMethodId });
      triggerDownload(blob, `cash-cut-${from}_${to}.pdf`);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExportingPdf(false);
    }
  }, [from, to, branchId, customerId, paymentMethodId]);

  const exportXlsx = useCallback(async () => {
    setIsExportingXlsx(true);
    setExportError(null);
    try {
      const blob = await downloadCashCutXlsx({ from, to, branchId, customerId, paymentMethodId });
      triggerDownload(blob, `cash-cut-${from}_${to}.xlsx`);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExportingXlsx(false);
    }
  }, [from, to, branchId, customerId, paymentMethodId]);

  return { report, isLoading, error, isExportingPdf, isExportingXlsx, exportError, refresh, exportPdf, exportXlsx };
}
