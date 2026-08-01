"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useBranchesOptions } from "../../../inventory/_logic/hooks/useBranchesOptions";
import { usePaymentMethodsOptions } from "../../../../_hooks/usePaymentMethodsOptions";
import { useCashiersOptions } from "../_logic/hooks/useCashiersOptions";
import { useSalesCut } from "../_logic/hooks/useSalesCut";
import { PeriodToggle } from "./PeriodToggle";
import { CutFilters } from "./CutFilters";
import { TotalsCards } from "./TotalsCards";
import { NetCashCard } from "./NetCashCard";
import { BreakdownTable } from "./BreakdownTable";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import type { PeriodMode } from "../_logic/types/domain";

export function SalesCutPage() {
  const { can } = useCurrentUser();
  const canRead = can("reports:sales_cut_read");
  const isBypass = can("branches:access_all");
  const { options: branches } = useBranchesOptions();
  const { options: paymentMethods } = usePaymentMethodsOptions();
  const { options: cashiers } = useCashiersOptions();

  const [mode, setMode] = useState<PeriodMode>("today");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [branchId, setBranchId] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [toastError, setToastError] = useState<string | null>(null);

  const { report, isLoading, error, isExporting, exportPdf } = useSalesCut({
    mode,
    from: mode === "range" && from ? from : undefined,
    to: mode === "range" && to ? to : undefined,
    branchId: branchId || undefined,
    cashierId: cashierId || undefined,
    paymentMethodId: paymentMethodId || undefined,
  });

  async function handleExportPdf() {
    setToastError(null);
    try {
      await exportPdf();
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
        description="No tienes permiso para ver el corte de ventas."
      />
    );
  }

  const hasData = report && (report.totals.ticketCount > 0 || Number(report.cash.netCash) !== 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" size={20} />
        </Link>
        <h1 className="text-headline-sm font-semibold text-on-surface">Corte de Ventas</h1>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <PeriodToggle
            mode={mode}
            onModeChange={setMode}
            from={from}
            onFromChange={setFrom}
            to={to}
            onToChange={setTo}
          />
          <CutFilters
            branchId={branchId}
            onBranchIdChange={setBranchId}
            branches={branches}
            showBranchFilter={isBypass === true}
            cashierId={cashierId}
            onCashierIdChange={setCashierId}
            cashiers={cashiers}
            paymentMethodId={paymentMethodId}
            onPaymentMethodIdChange={setPaymentMethodId}
            paymentMethods={paymentMethods}
          />
        </div>
        <button
          type="button"
          onClick={handleExportPdf}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-body-sm text-on-primary hover:bg-primary/90 disabled:opacity-50"
        >
          <Icon name="receipt_long" size={18} />
          {isExporting ? "Generando…" : "Exportar PDF"}
        </button>
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
          title="Sin ventas"
          description="No hay ventas en el periodo seleccionado."
        />
      ) : (
        <div className="space-y-5">
          <TotalsCards report={report} />
          <NetCashCard cash={report.cash} />
          <BreakdownTable title="Por método de pago" conceptHeader="Método" rows={report.byPaymentMethod} />
          <BreakdownTable title="Por día" conceptHeader="Día" rows={report.byDay} />
          <BreakdownTable title="Por cajero" conceptHeader="Cajero" rows={report.byCashier} />
          {isBypass === true && (
            <BreakdownTable title="Por sucursal" conceptHeader="Sucursal" rows={report.byBranch} />
          )}
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
