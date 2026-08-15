"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../../../_hooks/useCurrentUser";
import { useBranchesOptions } from "../../../../../_hooks/useBranchesOptions";
import { useCashCut } from "../../_logic/global/hooks/useCashCut";
import { CashCutFilters } from "./CashCutFilters";
import { TotalsCards } from "./TotalsCards";
import { PaymentMethodBreakdownTable } from "./PaymentMethodBreakdownTable";
import { CollectionsRowsTable } from "./CollectionsRowsTable";
import { EmptyState } from "../../../../../_components/molecules/EmptyState/EmptyState";
import { Button } from "../../../../../_components/atoms/Button/Button";
import { Spinner } from "../../../../../_components/atoms/Spinner/Spinner";

function defaultFrom(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export function GlobalCollectionsView() {
  const { can } = useCurrentUser();
  const isBypass = can("branches:access_all");
  const { options: branches } = useBranchesOptions();

  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [branchId, setBranchId] = useState("");
  const [toastError, setToastError] = useState<string | null>(null);

  const { report, isLoading, error, isExportingPdf, isExportingXlsx, exportPdf, exportXlsx } = useCashCut({
    from,
    to,
    branchId: branchId || undefined,
  });

  async function handleExport(fn: () => Promise<void>) {
    setToastError(null);
    try {
      await fn();
    } catch (err) {
      if (err instanceof Error) setToastError(err.message);
    }
  }

  const hasData = report && report.rows.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <CashCutFilters
          branchId={branchId}
          onBranchIdChange={setBranchId}
          branches={branches}
          showBranchFilter={isBypass === true}
          from={from}
          onFromChange={setFrom}
          to={to}
          onToChange={setTo}
        />
        <div className="flex gap-2">
          <Button
            icon="print"
            onClick={() => handleExport(exportPdf)}
            disabled={isExportingPdf || !hasData}
          >
            {isExportingPdf ? "Generando…" : "Exportar PDF"}
          </Button>
          <Button
            variant="outlined"
            icon="summarize"
            onClick={() => handleExport(exportXlsx)}
            disabled={isExportingXlsx || !hasData}
          >
            {isExportingXlsx ? "Generando…" : "Exportar Excel"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded px-4 py-3 text-body-sm text-error">
          {error.message}
        </div>
      )}

      {isLoading || !report ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : !hasData ? (
        <EmptyState
          icon="summarize"
          title="Sin cobranza"
          description="No hay abonos cobrados en el periodo seleccionado."
        />
      ) : (
        <div className="space-y-5">
          <TotalsCards report={report} />
          <PaymentMethodBreakdownTable rows={report.byPaymentMethod} />
          <CollectionsRowsTable rows={report.rows} />
        </div>
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
  );
}
