"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useDepartmentsOptions } from "../../../../_hooks/useDepartmentsOptions";
import { useBranchesOptions } from "../../../../_hooks/useBranchesOptions";
import { useInventoryReport } from "../_logic/hooks/useInventoryReport";
import { DepartmentFilter } from "./DepartmentFilter";
import { BranchFilter } from "../../_blocks/BranchFilter";
import { InventoryPriceStockTable } from "../../_blocks/InventoryPriceStockTable";
import { PageShell } from "../../../../_components/organisms/PageShell";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { PageLoading } from "../../../../_components/molecules/PageLoading/PageLoading";
import { Button } from "../../../../_components/atoms/Button/Button";
import { Spinner } from "../../../../_components/atoms/Spinner/Spinner";
import { SegmentedButton } from "../../../../_components/molecules/SegmentedButton/SegmentedButton";

type Tab = "department" | "global";

export function InventoryPage() {
  const { can } = useCurrentUser();
  const canRead = can("reports:inventory_read");
  const isBypass = can("branches:access_all");
  const { options: departments, isLoading: departmentsLoading } = useDepartmentsOptions();
  const { options: branches } = useBranchesOptions();

  const [tab, setTab] = useState<Tab>("department");
  const [departmentId, setDepartmentId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [toastError, setToastError] = useState<string | null>(null);

  const shouldFetch = tab === "global" || Boolean(departmentId);
  const { report, isLoading, error, isExportingPdf, isExportingXlsx, exportPdf, exportXlsx } =
    useInventoryReport({
      departmentId: tab === "department" ? departmentId || undefined : undefined,
      branchId: branchId || undefined,
      shouldFetch,
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
    return <PageLoading />;
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
    <PageShell title="Inventario" backHref="/reports">
      <div className="flex flex-col gap-4">
        <SegmentedButton<Tab>
          value={tab}
          onChange={setTab}
          aria-label="Vista"
          options={[
            { value: "department", label: "Por Departamento" },
            { value: "global", label: "Global" },
          ]}
        />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            {isBypass === true && (
              <BranchFilter branchId={branchId} onBranchIdChange={setBranchId} branches={branches} />
            )}
            {tab === "department" && (
              <DepartmentFilter
                departmentId={departmentId}
                onDepartmentIdChange={setDepartmentId}
                departments={departments}
                isLoading={departmentsLoading}
              />
            )}
          </div>
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

        {tab === "department" && !departmentId ? (
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
            description="No hay productos para los filtros seleccionados."
          />
        ) : (
          <InventoryPriceStockTable departments={report.departments} totals={report.totals} />
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
