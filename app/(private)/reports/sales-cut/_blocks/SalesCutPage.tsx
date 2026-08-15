"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useBranchesOptions } from "../../../../_hooks/useBranchesOptions";
import { usePaymentMethodsOptions } from "../../../../_hooks/usePaymentMethodsOptions";
import { useCashiersOptions } from "../_logic/hooks/useCashiersOptions";
import { useSalesCut } from "../_logic/hooks/useSalesCut";
import { PeriodToggle } from "./PeriodToggle";
import { CutFilters } from "./CutFilters";
import { TotalsCards } from "./TotalsCards";
import { NetCashCard } from "./NetCashCard";
import { BreakdownTable } from "./BreakdownTable";
import { SalesListTable } from "./SalesListTable";
import { PageShell } from "../../../../_components/organisms/PageShell";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { PageLoading } from "../../../../_components/molecules/PageLoading/PageLoading";
import { Button } from "../../../../_components/atoms/Button/Button";
import { Spinner } from "../../../../_components/atoms/Spinner/Spinner";
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

  const { report, isLoading, error, isExporting, isExportingXlsx, exportPdf, exportXlsx } = useSalesCut({
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

  async function handleExportXlsx() {
    setToastError(null);
    try {
      await exportXlsx();
    } catch (err) {
      if (err instanceof Error) setToastError(err.message);
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
        description="No tienes permiso para ver el corte de ventas."
      />
    );
  }

  const hasData = report && (report.totals.ticketCount > 0 || Number(report.cash.netCash) !== 0);

  return (
    <PageShell title="Corte de Ventas" backHref="/reports">
      <div className="flex flex-col gap-4">
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
          <div className="flex gap-2">
            <Button icon="receipt_long" onClick={handleExportPdf} disabled={isExporting}>
              {isExporting ? "Generando…" : "Exportar PDF"}
            </Button>
            <Button variant="outlined" icon="summarize" onClick={handleExportXlsx} disabled={isExportingXlsx}>
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
            <BreakdownTable title="Por departamento" conceptHeader="Departamento" rows={report.byDepartment} />
            <BreakdownTable
              title="Por producto"
              conceptHeader="Producto"
              rows={report.byProduct}
              quantityHeader="Piezas"
            />
            <SalesListTable rows={report.salesList} />
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
    </PageShell>
  );
}
