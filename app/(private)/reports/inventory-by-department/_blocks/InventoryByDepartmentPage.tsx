"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useDepartmentsOptions } from "../../../../_hooks/useDepartmentsOptions";
import { useDepartmentPriceList } from "../_logic/hooks/useDepartmentPriceList";
import { DepartmentFilter } from "./DepartmentFilter";
import { PriceListTable } from "./PriceListTable";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../../_components/atoms/Icon/Icon";

export function InventoryByDepartmentPage() {
  const { can } = useCurrentUser();
  const canRead = can("reports:inventory_read");
  const { options: departments, isLoading: departmentsLoading } = useDepartmentsOptions();

  const [departmentId, setDepartmentId] = useState("");
  const [toastError, setToastError] = useState<string | null>(null);

  const { report, isLoading, error, isExportingPdf, isExportingXlsx, exportPdf, exportXlsx } =
    useDepartmentPriceList(departmentId || undefined);

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
        description="No tienes permiso para ver este reporte."
      />
    );
  }

  const hasData = report && report.departments.length > 0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" size={20} />
        </Link>
        <h1 className="text-headline-sm font-semibold text-on-surface">Inventario por Departamento</h1>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <DepartmentFilter
          departmentId={departmentId}
          onDepartmentIdChange={setDepartmentId}
          departments={departments}
          isLoading={departmentsLoading}
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

      {!departmentId ? (
        <EmptyState
          icon="category"
          title="Selecciona un departamento"
          description="Elige un departamento para ver sus productos y listas de precio."
        />
      ) : isLoading || !report ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : !hasData ? (
        <EmptyState
          icon="inventory_2"
          title="Sin productos"
          description="Este departamento no tiene productos."
        />
      ) : (
        <PriceListTable departments={report.departments} totals={report.totals} />
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
