"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useDepartmentsOptions } from "../../../../_hooks/useDepartmentsOptions";
import { useBranchesOptions } from "../../../inventory/_logic/hooks/useBranchesOptions";
import { useSalesByProductReport } from "../_logic/hooks/useSalesByProductReport";
import { SalesByProductFilters } from "./SalesByProductFilters";
import { BreakdownTable } from "./BreakdownTable";
import { ProductBreakdownTable } from "./ProductBreakdownTable";
import { PageShell } from "../../../../_components/organisms/PageShell";
import { SegmentedButton } from "../../../../_components/molecules/SegmentedButton/SegmentedButton";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { PageLoading } from "../../../../_components/molecules/PageLoading/PageLoading";
import { Card } from "../../../../_components/molecules/Card/Card";
import { Button } from "../../../../_components/atoms/Button/Button";
import { Spinner } from "../../../../_components/atoms/Spinner/Spinner";

type GroupBy = "customer" | "department" | "product";

function defaultFrom(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
function defaultTo(): string {
  return new Date().toISOString().slice(0, 10);
}

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

export function SalesByProductPage() {
  const { can } = useCurrentUser();
  const canRead = can("reports:sales_by_product_read");
  const isBypass = can("branches:access_all");
  const { options: branches } = useBranchesOptions();
  const { options: departments } = useDepartmentsOptions();

  const [groupBy, setGroupBy] = useState<GroupBy>("product");
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());

  const { report, isLoading, error, isExportingPdf, isExportingXlsx, exportPdf, exportXlsx } =
    useSalesByProductReport({
      branchId: branchId || undefined,
      departmentId: departmentId || undefined,
      customerId: customerId || undefined,
      from,
      to,
    });

  if (canRead === "loading") {
    return <PageLoading />;
  }

  if (canRead === false) {
    return <EmptyState icon="block" title="Sin acceso" description="No tienes permiso para ver el reporte de ventas por producto." />;
  }

  const hasData = report && report.totals.ticketCount > 0;

  return (
    <PageShell title="Ventas por Producto" backHref="/reports">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SalesByProductFilters
            branchId={branchId}
            onBranchIdChange={setBranchId}
            branches={branches}
            showBranchFilter={isBypass === true}
            departmentId={departmentId}
            onDepartmentIdChange={setDepartmentId}
            departments={departments}
            customerId={customerId}
            onCustomerIdChange={setCustomerId}
            from={from}
            onFromChange={setFrom}
            to={to}
            onToChange={setTo}
          />
          <div className="flex gap-2">
            <Button icon="print" onClick={() => exportPdf()} disabled={isExportingPdf || !hasData}>
              {isExportingPdf ? "Generando…" : "Exportar PDF"}
            </Button>
            <Button variant="outlined" icon="summarize" onClick={() => exportXlsx()} disabled={isExportingXlsx || !hasData}>
              {isExportingXlsx ? "Generando…" : "Exportar Excel"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-error-container/20 rounded px-4 py-3 text-body-sm text-error">{error.message}</div>
        )}

        {isLoading || !report ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !hasData ? (
          <EmptyState icon="trending_up" title="Sin ventas" description="No hay ventas en el periodo seleccionado." />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="flex flex-col">
                <span className="text-label-sm text-on-surface-variant">Tickets</span>
                <span className="text-title-md font-semibold text-on-surface tabular-nums">{report.totals.ticketCount}</span>
              </Card>
              <Card className="flex flex-col">
                <span className="text-label-sm text-on-surface-variant">Total</span>
                <span className="text-title-md font-semibold text-on-surface tabular-nums">{MX.format(Number(report.totals.total))}</span>
              </Card>
            </div>

            <SegmentedButton<GroupBy>
              value={groupBy}
              onChange={setGroupBy}
              aria-label="Agrupar por"
              options={[
                { value: "customer", label: "Cliente" },
                { value: "department", label: "Departamento" },
                { value: "product", label: "Producto" },
              ]}
            />

            {groupBy === "customer" && <BreakdownTable rows={report.byCustomer} nameLabel="Cliente" />}
            {groupBy === "department" && <BreakdownTable rows={report.byDepartment} nameLabel="Departamento" />}
            {groupBy === "product" && <ProductBreakdownTable rows={report.byProduct} />}
          </div>
        )}
      </div>
    </PageShell>
  );
}
