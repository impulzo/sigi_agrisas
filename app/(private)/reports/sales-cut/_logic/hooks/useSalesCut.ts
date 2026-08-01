"use client";

import { useState, useEffect, useCallback } from "react";
import { getSalesCut, downloadSalesCutPdf } from "../services";
import type { SalesCutReportDto } from "../types/api";
import type { SalesCutFilters } from "../types/domain";

interface Result {
  report: SalesCutReportDto | null;
  isLoading: boolean;
  error: Error | null;
  isExporting: boolean;
  exportError: Error | null;
  refresh: () => void;
  exportPdf: () => Promise<void>;
}

export function useSalesCut(filters: SalesCutFilters): Result {
  const [report, setReport] = useState<SalesCutReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const { mode, from, to, branchId, cashierId, paymentMethodId } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getSalesCut({ mode, from, to, branchId, cashierId, paymentMethodId, signal: controller.signal })
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
  }, [mode, from, to, branchId, cashierId, paymentMethodId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const exportPdf = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const blob = await downloadSalesCutPdf({ mode, from, to, branchId, cashierId, paymentMethodId });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `sales-cut-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExporting(false);
    }
  }, [mode, from, to, branchId, cashierId, paymentMethodId]);

  return { report, isLoading, error, isExporting, exportError, refresh, exportPdf };
}
