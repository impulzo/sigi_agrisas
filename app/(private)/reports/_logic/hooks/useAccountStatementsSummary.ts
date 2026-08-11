"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAccountStatementsSummary,
  downloadAccountStatementSummaryPdf,
  downloadAccountStatementSummaryXlsx,
} from "../services";
import type { AccountStatementSummaryDto } from "../types/api";
import type { AccountStatementsSummaryFilters } from "../types/domain";

interface Result {
  report: AccountStatementSummaryDto | null;
  isLoading: boolean;
  error: Error | null;
  isExporting: boolean;
  isExportingXlsx: boolean;
  refresh: () => void;
  exportPdf: () => Promise<void>;
  exportXlsx: () => Promise<void>;
}

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

export function useAccountStatementsSummary(
  filters: AccountStatementsSummaryFilters
): Result {
  const [report, setReport] = useState<AccountStatementSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [tick, setTick] = useState(0);

  const { branchId, search, from, to, onlyWithBalance, page = 1, pageSize = 20 } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getAccountStatementsSummary({
      branchId, search, from, to, onlyWithBalance, page, pageSize,
      signal: controller.signal,
    })
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
  }, [branchId, search, from, to, onlyWithBalance, page, pageSize, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const exportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await downloadAccountStatementSummaryPdf({
        branchId, search, from, to, onlyWithBalance,
      });
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `account-statements-${today}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, [branchId, search, from, to, onlyWithBalance]);

  const exportXlsx = useCallback(async () => {
    setIsExportingXlsx(true);
    try {
      const blob = await downloadAccountStatementSummaryXlsx({
        branchId, search, from, to, onlyWithBalance,
      });
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `account-statements-${today}.xlsx`);
    } finally {
      setIsExportingXlsx(false);
    }
  }, [branchId, search, from, to, onlyWithBalance]);

  return { report, isLoading, error, isExporting, isExportingXlsx, refresh, exportPdf, exportXlsx };
}
