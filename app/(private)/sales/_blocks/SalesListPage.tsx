"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useDebounce } from "../../../_hooks/useDebounce";
import { useSalesList } from "../_logic/hooks/useSalesList";
import { CatalogShell } from "../../catalogs/_blocks/CatalogShell";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { SalesToolbar } from "./SalesToolbar";
import { SalesTable } from "./SalesTable";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import type { BranchOption } from "../../pos/_logic/types/api";
import { useBranchesOptions } from "../../inventory/_logic/hooks/useBranchesOptions";

export function SalesListPage() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canRead = can("sales:read");
  const isBypass = can("branches:access_all");

  const { options: branchOptions } = useBranchesOptions();
  const branches: BranchOption[] = branchOptions.map((b) => ({
    id: b.id,
    code: "",
    name: b.name,
    isHeadquarters: false,
  }));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const debouncedSearch = useDebounce(searchInput, 300);

  const { items, total, isLoading, error } = useSalesList({
    page,
    pageSize,
    branchId: branchId || undefined,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    from: from || undefined,
    to: to || undefined,
    search: debouncedSearch || undefined,
  });

  function handleSearch(val: string) {
    setSearchInput(val);
    setPage(1);
  }

  function handleReset() {
    setSearchInput("");
    setBranchId("");
    setStatusFilter([]);
    setFrom("");
    setTo("");
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
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para ver ventas."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="warning"
        title="Error al cargar ventas"
        description={error.message}
      />
    );
  }

  return (
    <CatalogShell
      title="Ventas"
      description="Historial de ventas emitidas"
      toolbar={
        <SalesToolbar
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
      <SalesTable items={items} isLoading={isLoading} onEnter={(sale) => router.push(`/sales/${sale.id}`)} />
      <CatalogPagination
        page={page}
        pageSize={pageSize}
        total={total}
        count={items.length}
        onPageChange={setPage}
        onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
      />
    </CatalogShell>
  );
}
