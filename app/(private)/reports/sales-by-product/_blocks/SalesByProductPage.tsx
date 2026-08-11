"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useDepartmentsOptions } from "../../../../_hooks/useDepartmentsOptions";
import { useBranchesOptions } from "../../../inventory/_logic/hooks/useBranchesOptions";
import { useSalesByProductReport } from "../_logic/hooks/useSalesByProductReport";
import { SalesByProductFilters } from "./SalesByProductFilters";
import { BreakdownTable } from "./BreakdownTable";
import { ProductBreakdownTable } from "./ProductBreakdownTable";
import { SegmentedButton } from "../../../../_components/molecules/SegmentedButton/SegmentedButton";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../../_components/atoms/Icon/Icon";

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
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (canRead === false) {
    return <EmptyState icon="block" title="Sin acceso" description="No tienes permiso para ver el reporte de ventas por producto." />;
  }

  const hasData = report && report.totals.ticketCount > 0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" size={20} />
        </Link>
        <h1 className="text-headline-sm font-semibold text-on-surface">Ventas por Producto</h1>
      </div>

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
          <button
            type="button"
            onClick={() => exportPdf()}
            disabled={isExportingPdf || !hasData}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-body-sm text-on-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Icon name="print" size={18} />
            {isExportingPdf ? "Generando…" : "Exportar PDF"}
          </button>
          <button
            type="button"
            onClick={() => exportXlsx()}
            disabled={isExportingXlsx || !hasData}
            className="flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-body-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
          >
            <Icon name="summarize" size={18} />
            {isExportingXlsx ? "Generando…" : "Exportar Excel"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container/20 rounded-xl px-4 py-3 text-body-sm text-error">{error.message}</div>
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
            <div className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3">
              <span className="text-label-sm text-on-surface-variant">Tickets</span>
              <span className="text-title-md font-semibold text-on-surface tabular-nums">{report.totals.ticketCount}</span>
            </div>
            <div className="flex flex-col rounded-2xl border border-outline-variant bg-surface-container-low px-4 py-3">
              <span className="text-label-sm text-on-surface-variant">Total</span>
              <span className="text-title-md font-semibold text-on-surface tabular-nums">{MX.format(Number(report.totals.total))}</span>
            </div>
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
  );
}
