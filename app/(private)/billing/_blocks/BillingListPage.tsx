"use client";

import { useState } from "react";
import Link from "next/link";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useInvoicesList } from "../_logic/hooks/useInvoicesList";
import { PageShell } from "../../../_components/organisms/PageShell";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { BillingToolbar } from "./BillingToolbar";
import { InvoicesTable } from "./InvoicesTable";
import { BillingEmpty } from "./BillingEmpty";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { CreateButton } from "../../../_components/molecules/CreateButton/CreateButton";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { useBranchesOptions } from "../../../_hooks/useBranchesOptions";
import type { InvoiceStatus } from "../_logic/types/domain";

export function BillingListPage() {
  const { can } = useCurrentUser();
  const canRead = can("billing:read");
  const canWrite = can("billing:write");
  const canManageCsd = can("billing:manage_csd");
  const isBypass = can("branches:access_all");

  const { options: branchOptions } = useBranchesOptions();
  const branches = branchOptions.map((b) => ({ id: b.id, name: b.name }));

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>(undefined);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { items, total, isLoading, error } = useInvoicesList({
    page,
    pageSize,
    status: statusFilter,
    branchId: branchId || undefined,
    from: from || undefined,
    to: to || undefined,
    search: searchInput,
  });

  function handleSearch(val: string) { setSearchInput(val); setPage(1); }
  function handleReset() {
    setSearchInput(""); setBranchId(""); setStatusFilter(undefined);
    setFrom(""); setTo(""); setPage(1);
  }

  if (canRead === "loading") {
    return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;
  }

  if (canRead === false) {
    return <EmptyState icon="block" title="Sin acceso" description="No tienes permiso para ver facturas." />;
  }

  if (error) {
    return <EmptyState icon="warning" title="Error al cargar facturas" description={error.message} />;
  }

  return (
    <PageShell
      title="Facturación"
      description="Comprobantes fiscales digitales (CFDI 4.0)"
      actions={
        <>
          {(canManageCsd === true || canManageCsd === "loading") && (
            <Link
              href="/billing/csd"
              className="inline-flex items-center justify-center rounded-full border border-outline text-on-surface px-4 py-2 text-label-lg font-medium hover:bg-surface-container transition-colors"
            >
              Configurar CSD
            </Link>
          )}
          {(canWrite === true || canWrite === "loading") && (
            <CreateButton label="Nueva factura" href="/billing/new" />
          )}
        </>
      }
      toolbar={
        <BillingToolbar
          search={searchInput}
          onSearchChange={handleSearch}
          branchId={branchId}
          onBranchChange={(v) => { setBranchId(v); setPage(1); }}
          branches={branches}
          showBranchFilter={isBypass === true}
          statusFilter={statusFilter}
          onStatusChange={(v) => { setStatusFilter(v); setPage(1); }}
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onReset={handleReset}
        />
      }
    >
      {!isLoading && items.length === 0 ? (
        <BillingEmpty />
      ) : (
        <>
          <InvoicesTable
            items={items}
            isLoading={isLoading}
            showBranch={isBypass === true}
          />
          <CatalogPagination
            page={page}
            pageSize={pageSize}
            total={total}
            count={items.length}
            onPageChange={setPage}
            onPageSizeChange={() => {}}
          />
        </>
      )}
    </PageShell>
  );
}
