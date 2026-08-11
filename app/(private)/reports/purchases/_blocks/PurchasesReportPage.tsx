"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useBranchesOptions } from "../../../inventory/_logic/hooks/useBranchesOptions";
import { usePurchasesReport } from "../_logic/hooks/usePurchasesReport";
import { useProviderPaymentsReport } from "../_logic/hooks/useProviderPaymentsReport";
import { PurchasesFilters } from "./PurchasesFilters";
import { PurchasesTable } from "./PurchasesTable";
import { ProviderPaymentsTable } from "./ProviderPaymentsTable";
import { CatalogPagination } from "../../../catalogs/_blocks/CatalogPagination";
import { SegmentedButton } from "../../../../_components/molecules/SegmentedButton/SegmentedButton";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../../_components/atoms/Spinner/Spinner";
import { Icon } from "../../../../_components/atoms/Icon/Icon";

type Section = "purchases" | "provider-payments";

export function PurchasesReportPage() {
  const { can } = useCurrentUser();
  const canRead = can("reports:purchases_read");
  const isBypass = can("branches:access_all");
  const { options: branches } = useBranchesOptions();

  const [section, setSection] = useState<Section>("purchases");
  const [branchId, setBranchId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filters = {
    branchId: branchId || undefined,
    providerId: providerId || undefined,
    status: (status || undefined) as "completed" | "cancelled" | undefined,
    from: from || undefined,
    to: to || undefined,
    page,
    pageSize,
  };

  const purchases = usePurchasesReport(filters, section === "purchases");
  const providerPayments = useProviderPaymentsReport(filters, section === "provider-payments");

  function resetPage() {
    setPage(1);
  }

  if (canRead === "loading") {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (canRead === false) {
    return <EmptyState icon="block" title="Sin acceso" description="No tienes permiso para ver el reporte de compras." />;
  }

  const active = section === "purchases" ? purchases : providerPayments;
  const total = active.report?.totals.count ?? 0;
  const count = section === "purchases" ? purchases.report?.rows.length ?? 0 : providerPayments.report?.rows.length ?? 0;

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/reports" className="text-on-surface-variant hover:text-on-surface">
          <Icon name="arrow_back" size={20} />
        </Link>
        <h1 className="text-headline-sm font-semibold text-on-surface">Compras</h1>
      </div>

      <SegmentedButton<Section>
        value={section}
        onChange={(v) => { setSection(v); resetPage(); }}
        aria-label="Sección de compras"
        options={[
          { value: "purchases", label: "Compras" },
          { value: "provider-payments", label: "Pagos a Proveedores" },
        ]}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <PurchasesFilters
          branchId={branchId}
          onBranchIdChange={(v) => { setBranchId(v); resetPage(); }}
          branches={branches}
          showBranchFilter={isBypass === true}
          providerId={providerId}
          onProviderIdChange={(v) => { setProviderId(v); resetPage(); }}
          status={status}
          onStatusChange={(v) => { setStatus(v); resetPage(); }}
          from={from}
          onFromChange={(v) => { setFrom(v); resetPage(); }}
          to={to}
          onToChange={(v) => { setTo(v); resetPage(); }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => active.exportPdf()}
            disabled={active.isExportingPdf || count === 0}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-body-sm text-on-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Icon name="print" size={18} />
            {active.isExportingPdf ? "Generando…" : "Exportar PDF"}
          </button>
          <button
            type="button"
            onClick={() => active.exportXlsx()}
            disabled={active.isExportingXlsx || count === 0}
            className="flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-body-sm text-on-surface hover:bg-surface-container disabled:opacity-50"
          >
            <Icon name="summarize" size={18} />
            {active.isExportingXlsx ? "Generando…" : "Exportar Excel"}
          </button>
        </div>
      </div>

      {active.error && (
        <div className="bg-error-container/20 rounded-xl px-4 py-3 text-body-sm text-error">{active.error.message}</div>
      )}

      {active.isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : count === 0 ? (
        <EmptyState
          icon="local_shipping"
          title={section === "purchases" ? "Sin compras" : "Sin pagos a proveedores"}
          description="No hay resultados con los filtros aplicados."
        />
      ) : (
        <>
          {section === "purchases" ? (
            <PurchasesTable rows={purchases.report?.rows ?? []} />
          ) : (
            <ProviderPaymentsTable rows={providerPayments.report?.rows ?? []} />
          )}
          <CatalogPagination
            page={page}
            pageSize={pageSize}
            total={total}
            count={count}
            onPageChange={setPage}
            onPageSizeChange={(ps) => { setPageSize(ps); resetPage(); }}
          />
        </>
      )}
    </div>
  );
}
