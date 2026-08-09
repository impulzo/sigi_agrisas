"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getDepartmentPriceList,
  downloadDepartmentPriceListPdf,
  downloadDepartmentPriceListXlsx,
} from "../services";
import type { DepartmentPriceListReportDto } from "../types/api";

interface Result {
  report: DepartmentPriceListReportDto | null;
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

export function useDepartmentPriceList(departmentId?: string): Result {
  const [report, setReport] = useState<DepartmentPriceListReportDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState(false);
  const [exportError, setExportError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!departmentId) {
      setReport(null);
      setIsLoading(false);
      setError(null);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getDepartmentPriceList({ departmentId, signal: controller.signal })
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
  }, [departmentId, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const exportPdf = useCallback(async () => {
    if (!departmentId) return;
    setIsExportingPdf(true);
    setExportError(null);
    try {
      const blob = await downloadDepartmentPriceListPdf({ departmentId });
      triggerDownload(blob, `inventory-by-department-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExportingPdf(false);
    }
  }, [departmentId]);

  const exportXlsx = useCallback(async () => {
    if (!departmentId) return;
    setIsExportingXlsx(true);
    setExportError(null);
    try {
      const blob = await downloadDepartmentPriceListXlsx({ departmentId });
      triggerDownload(blob, `inventory-by-department-${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      setExportError(err as Error);
    } finally {
      setIsExportingXlsx(false);
    }
  }, [departmentId]);

  return { report, isLoading, error, isExportingPdf, isExportingXlsx, exportError, refresh, exportPdf, exportXlsx };
}
