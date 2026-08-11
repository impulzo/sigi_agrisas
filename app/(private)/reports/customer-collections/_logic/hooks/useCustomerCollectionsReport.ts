"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getCustomerCollectionsReport,
  downloadCustomerCollectionsPdf,
  downloadCustomerCollectionsXlsx,
} from "../services";
import type { CollectionsReportDto } from "../types/api";
import type { CustomerCollectionsFilters } from "../types/domain";

interface Result {
  report: CollectionsReportDto | null;
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

export function useCustomerCollectionsReport(filters: CustomerCollectionsFilters): Result {
  const [report, setReport] = useState<CollectionsReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);

  const { branchId, customerId, from, to } = filters;

  useEffect(() => {
    if (!from || !to) {
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getCustomerCollectionsReport({ branchId, customerId, from, to, signal: controller.signal })
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
  }, [branchId, customerId, from, to]);

  const exportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    try {
      const blob = await downloadCustomerCollectionsPdf({ branchId, customerId, from, to });
      triggerDownload(blob, `customer-collections-${from}_${to}.pdf`);
    } finally {
      setIsExportingPdf(false);
    }
  }, [branchId, customerId, from, to]);

  const exportXlsx = useCallback(async () => {
    setIsExportingXlsx(true);
    try {
      const blob = await downloadCustomerCollectionsXlsx({ branchId, customerId, from, to });
      triggerDownload(blob, `customer-collections-${from}_${to}.xlsx`);
    } finally {
      setIsExportingXlsx(false);
    }
  }, [branchId, customerId, from, to]);

  return { report, isLoading, error, isExportingPdf, isExportingXlsx, exportPdf, exportXlsx };
}
