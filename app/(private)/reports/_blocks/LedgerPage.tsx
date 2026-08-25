"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useAccountStatementLedger } from "../_logic/hooks/useAccountStatementLedger";
import type { LedgerSort } from "../_logic/types/domain";
import { PeriodSelector, PeriodMode } from "./PeriodSelector";
import { LedgerControls } from "./LedgerControls";
import { LedgerHeader } from "./LedgerHeader";
import { LedgerTable } from "./LedgerTable";
import { ExportPdfButton } from "../../../_components/molecules/PdfDownloadButton/PdfDownloadButton";
import { ExportXlsxButton } from "./ExportXlsxButton";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { PageLoading } from "../../../_components/molecules/PageLoading/PageLoading";
import { PageShell } from "../../../_components/organisms/PageShell";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";

export function LedgerPage({ customerId }: { customerId: string }) {
  const { can } = useCurrentUser();
  const canRead = can("reports:account_statements_read");

  const [mode, setMode] = useState<PeriodMode>("full");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [history, setHistory] = useState(true);
  const [sort, setSort] = useState<LedgerSort>("date");
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const applyRange = mode === "range";
  const { ledger, isLoading, error, isExporting, isExportingXlsx, exportPdf, exportXlsx, printAnticipo } =
    useAccountStatementLedger(customerId, {
      from: applyRange && from ? from : undefined,
      to: applyRange && to ? to : undefined,
      history,
      sort,
    });

  async function handleExportPdf() {
    setToastError(null);
    try {
      await exportPdf();
    } catch (err) {
      if (err instanceof Error) setToastError(err.message);
    }
  }

  async function handleExportXlsx() {
    setToastError(null);
    try {
      await exportXlsx();
    } catch (err) {
      if (err instanceof Error) setToastError(err.message);
    }
  }

  async function handlePrintAnticipo(paymentId: string) {
    setToastError(null);
    setPrintingId(paymentId);
    try {
      await printAnticipo(paymentId);
    } catch (err) {
      if (err instanceof Error) setToastError(err.message);
    } finally {
      setPrintingId(null);
    }
  }

  if (canRead === "loading") {
    return <PageLoading />;
  }

  if (canRead === false) {
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para ver los estados de cuenta."
      />
    );
  }

  return (
    <PageShell title="Estado de cuenta" backHref="/reports/account-statements">
      <div className="flex flex-col gap-lg">
      {error ? (
        <div className="bg-error-container/20 rounded px-4 py-3 text-body-sm text-error">
          {error.message}
        </div>
      ) : isLoading || !ledger ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          <LedgerHeader ledger={ledger} />

          <div className="flex flex-wrap items-end justify-between gap-3">
            <PeriodSelector
              mode={mode}
              onModeChange={setMode}
              from={from}
              onFromChange={setFrom}
              to={to}
              onToChange={setTo}
            />
            <div className="flex gap-2">
              <ExportPdfButton loading={isExporting} onClick={handleExportPdf} />
              <ExportXlsxButton isExporting={isExportingXlsx} onClick={handleExportXlsx} />
            </div>
          </div>

          <LedgerControls
            history={history}
            onHistoryChange={setHistory}
            sort={sort}
            onSortChange={setSort}
          />

          {ledger.movements.length === 0 ? (
            <EmptyState
              icon="summarize"
              title="Sin movimientos"
              description="Este cliente no tiene movimientos en el periodo seleccionado."
            />
          ) : (
            <LedgerTable
              groups={ledger.groups}
              totals={ledger.totals}
              closingBalance={ledger.closingBalance}
              onPrintAnticipo={handlePrintAnticipo}
              printingId={printingId}
            />
          )}
        </>
      )}

      {toastError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-error-container text-on-error-container px-5 py-3 rounded-full text-body-sm shadow-lg z-50"
        >
          {toastError}
        </div>
      )}
      </div>
    </PageShell>
  );
}
