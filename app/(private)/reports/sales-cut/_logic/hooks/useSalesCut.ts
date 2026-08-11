"use client";

import { useState, useEffect, useCallback } from "react";
import { getSalesCut, downloadSalesCutPdf, downloadSalesCutXlsx } from "../services";
import type { SalesCutReportDto } from "../types/api";
import type { SalesCutFilters } from "../types/domain";

interface Result {
  report: SalesCutReportDto | null;
  isLoading: boolean;
  error: Error | null;
  isExporting: boolean;
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

export function useSalesCut(filters: SalesCutFilters): Result {
  const [report, setReport] = useState<SalesCutReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
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
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `sales-cut-${today}.pdf`);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExporting(false);
    }
  }, [mode, from, to, branchId, cashierId, paymentMethodId]);

  const exportXlsx = useCallback(async () => {
    setIsExportingXlsx(true);
    setExportError(null);
    try {
      const blob = await downloadSalesCutXlsx({ mode, from, to, branchId, cashierId, paymentMethodId });
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `sales-cut-${today}.xlsx`);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExportingXlsx(false);
    }
  }, [mode, from, to, branchId, cashierId, paymentMethodId]);

  return { report, isLoading, error, isExporting, isExportingXlsx, exportError, refresh, exportPdf, exportXlsx };
}
