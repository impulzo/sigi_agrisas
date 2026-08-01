"use client";

import { useState, useCallback, useRef } from "react";
import { getKardex } from "../services/getKardex";
import { downloadKardexXlsx } from "../services/downloadKardexXlsx";
import { downloadKardexPdf } from "../services/downloadKardexPdf";
import { rebuildInventoryArticle } from "../services/rebuildInventoryArticle";
import type { KardexReportDto } from "../types/api";
import type { KardexFilters } from "../types/domain";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function useKardex() {
  const [report, setReport] = useState<KardexReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [rebuildError, setRebuildError] = useState<Error | null>(null);
  const [rebuildResult, setRebuildResult] = useState<{ previousQuantity: number; newQuantity: number } | null>(null);
  const lastFiltersRef = useRef<KardexFilters | null>(null);

  const fetchReport = useCallback(async (filters: KardexFilters) => {
    lastFiltersRef.current = filters;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getKardex(filters);
      setReport(data);
    } catch (err) {
      setReport(null);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exportXlsx = useCallback(async () => {
    const filters = lastFiltersRef.current;
    if (!filters || !report) return;
    setIsExporting(true);
    try {
      const blob = await downloadKardexXlsx(filters);
      triggerDownload(blob, `kardex-${report.product.code}-${filters.from}_${filters.to}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  }, [report]);

  const exportPdf = useCallback(async () => {
    const filters = lastFiltersRef.current;
    if (!filters || !report) return;
    setIsExporting(true);
    try {
      const blob = await downloadKardexPdf(filters);
      triggerDownload(blob, `kardex-${report.product.code}-${filters.from}_${filters.to}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, [report]);

  const rebuild = useCallback(async () => {
    const filters = lastFiltersRef.current;
    if (!filters?.branchId) return;
    setIsRebuilding(true);
    setRebuildError(null);
    setRebuildResult(null);
    try {
      const result = await rebuildInventoryArticle({ productId: filters.productId, branchId: filters.branchId });
      setRebuildResult({ previousQuantity: result.previousQuantity, newQuantity: result.newQuantity });
      await fetchReport(filters);
    } catch (err) {
      setRebuildError(err as Error);
    } finally {
      setIsRebuilding(false);
    }
  }, [fetchReport]);

  return {
    report,
    isLoading,
    error,
    fetchReport,
    isExporting,
    exportXlsx,
    exportPdf,
    isRebuilding,
    rebuildError,
    rebuildResult,
    rebuild,
  };
}
