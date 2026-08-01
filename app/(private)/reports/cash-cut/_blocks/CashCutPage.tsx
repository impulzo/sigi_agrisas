"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useBranchesOptions } from "../../../inventory/_logic/hooks/useBranchesOptions";
import { useCashCut } from "../_logic/hooks/useCashCut";
import { CashCutFilters } from "./CashCutFilters";
import { TotalsCards } from "./TotalsCards";
import { PaymentMethodBreakdownTable } from "./PaymentMethodBreakdownTable";
import { CollectionsRowsTable } from "./CollectionsRowsTable";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../../_components/atoms/Icon/Icon";

function defaultFrom(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

export function CashCutPage() {
  const { can } = useCurrentUser();
  const canRead = can("reports:cash_cut_read");
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

  if (canRead === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (canRead === false) {
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para ver el corte de caja."
      />
    );
  }

  const hasData = report && report.rows.length > 0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" size={20} />
        </Link>
        <h1 className="text-headline-sm font-semibold text-on-surface">Corte de Caja (Cobranza)</h1>
      </div>

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
          <button
            type="button"
            onClick={() => handleExport(exportPdf)}
            disabled={isExportingPdf || !hasData}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-body-sm text-on-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Icon name="print" size={18} />
            {isExportingPdf ? "Generando…" : "Exportar PDF"}
          </button>
          <button
            type="button"
            onClick={() => handleExport(exportXlsx)}
            disabled={isExportingXlsx || !hasData}
            className="flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-body-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
          >
            <Icon name="summarize" size={18} />
            {isExportingXlsx ? "Generando…" : "Exportar Excel"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded-xl px-4 py-3 text-body-sm text-error">
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
