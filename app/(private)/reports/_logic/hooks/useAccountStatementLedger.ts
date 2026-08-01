"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAccountStatementLedger,
  downloadAccountStatementLedgerPdf,
  downloadAnticipoReceiptPdf,
} from "../services";
import type { AccountStatementLedgerDto } from "../types/api";
import type { AccountStatementLedgerFilters } from "../types/domain";

interface Result {
  ledger: AccountStatementLedgerDto | null;
  isLoading: boolean;
  error: Error | null;
  isExporting: boolean;
  refresh: () => void;
  exportPdf: () => Promise<void>;
  printAnticipo: (paymentId: string) => Promise<void>;
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

export function useAccountStatementLedger(
  customerId: string,
  filters: AccountStatementLedgerFilters
): Result {
  const [ledger, setLedger] = useState<AccountStatementLedgerDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [tick, setTick] = useState(0);

  const { branchId, from, to, history, sort } = filters;

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    getAccountStatementLedger(customerId, {
      branchId,
      from,
      to,
      history,
      sort,
      signal: controller.signal,
    })
      .then((data) => {
        setLedger(data);
        setIsLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return;
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [customerId, branchId, from, to, history, sort, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const exportPdf = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await downloadAccountStatementLedgerPdf(customerId, {
        branchId,
        from,
        to,
        history,
        sort,
      });
      const today = new Date().toISOString().slice(0, 10);
      const scope = ledger?.customer.code ?? customerId;
      triggerDownload(blob, `account-statement-${scope}-${today}.pdf`);
    } finally {
      setIsExporting(false);
    }
  }, [customerId, branchId, from, to, history, sort, ledger]);

  const printAnticipo = useCallback(
    async (paymentId: string) => {
      const blob = await downloadAnticipoReceiptPdf(customerId, paymentId);
      const today = new Date().toISOString().slice(0, 10);
      triggerDownload(blob, `anticipo-${paymentId}-${today}.pdf`);
    },
    [customerId]
  );

  return { ledger, isLoading, error, isExporting, refresh, exportPdf, printAnticipo };
}
