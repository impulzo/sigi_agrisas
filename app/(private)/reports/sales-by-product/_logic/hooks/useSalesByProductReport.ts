"use client";

import { useState, useEffect, useCallback } from "react";
import { getSalesByProductReport, downloadSalesByProductPdf, downloadSalesByProductXlsx } from "../services";
import type { SalesByProductReportDto } from "../types/api";
import type { SalesByProductFilters } from "../types/domain";

interface Result {
  report: SalesByProductReportDto | null;
  isLoading: boolean;
  error: Error | null;
  isExportingPdf: boolean;
  isExportingXlsx: boolean;
  exportError: Error | null;
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

export function useSalesByProductReport(filters: SalesByProductFilters): Result {
  const [report, setReport] = useState<SalesByProductReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [exportError, setExportError] = useState<Error | null>(null);

  const { branchId, departmentId, customerId, from, to, page, pageSize } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getSalesByProductReport({ branchId, departmentId, customerId, from, to, page, pageSize, signal: controller.signal })
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
  }, [branchId, departmentId, customerId, from, to, page, pageSize]);

  const exportPdf = useCallback(async () => {
    setIsExportingPdf(true);
    setExportError(null);
    try {
      const blob = await downloadSalesByProductPdf({ branchId, departmentId, customerId, from, to, page, pageSize });
      triggerDownload(blob, `sales-by-product-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExportingPdf(false);
    }
  }, [branchId, departmentId, customerId, from, to, page, pageSize]);

  const exportXlsx = useCallback(async () => {
    setIsExportingXlsx(true);
    setExportError(null);
    try {
      const blob = await downloadSalesByProductXlsx({ branchId, departmentId, customerId, from, to, page, pageSize });
      triggerDownload(blob, `sales-by-product-${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExportingXlsx(false);
    }
  }, [branchId, departmentId, customerId, from, to, page, pageSize]);

  return { report, isLoading, error, isExportingPdf, isExportingXlsx, exportError, exportPdf, exportXlsx };
}
