"use client";

import { useState, useEffect, useCallback } from "react";
import { getProviderPaymentsReport, downloadProviderPaymentsPdf, downloadProviderPaymentsXlsx } from "../services";
import type { ProviderPaymentsReportDto } from "../types/api";
import type { ProviderPaymentsReportFilters } from "../types/domain";

interface Result {
  report: ProviderPaymentsReportDto | null;
  isLoading: boolean;
  error: Error | null;
  isExportingPdf: boolean;
  isExportingXlsx: boolean;
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

export function useProviderPaymentsReport(filters: ProviderPaymentsReportFilters, enabled: boolean): Result {
  const [report, setReport] = useState<ProviderPaymentsReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);

  const { branchId, providerId, status, from, to, page, pageSize } = filters;

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getProviderPaymentsReport(
      { branchId, providerId, status, from, to, page, pageSize, signal: controller.signal }
    )
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
  }, [enabled, branchId, providerId, status, from, to, page, pageSize]);

  const exportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      const blob = await downloadProviderPaymentsPdf({ branchId, providerId, status, from, to, page, pageSize });
      triggerDownload(blob, `provider-payments-${new Date().toISOString().split("T")[0]}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  }, [branchId, providerId, status, from, to, page, pageSize]);

  const exportXlsx = useCallback(async () => {
    setIsExportingXlsx(true);
    try {
      const blob = await downloadProviderPaymentsXlsx({ branchId, providerId, status, from, to, page, pageSize });
      triggerDownload(blob, `provider-payments-${new Date().toISOString().split("T")[0]}.xlsx`);
    } finally {
      setIsExportingXlsx(false);
    }
  }, [branchId, providerId, status, from, to, page, pageSize]);

  return { report, isLoading, error, isExportingPdf, isExportingXlsx, exportPdf, exportXlsx };
}
