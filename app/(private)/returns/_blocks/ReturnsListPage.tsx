"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useReturnsList } from "../_logic/hooks/useReturnsList";
import { CatalogShell } from "../../catalogs/_blocks/CatalogShell";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { ReturnsToolbar } from "./ReturnsToolbar";
import { ReturnsTable } from "./ReturnsTable";
import { ReturnsEmpty } from "./ReturnsEmpty";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { useBranchesOptions } from "../../inventory/_logic/hooks/useBranchesOptions";
import type { ReturnStatus } from "../_logic/types/api";

export function ReturnsListPage() {
  const { can } = useCurrentUser();
  const canRead = can("returns:read");
  const isBypass = can("branches:access_all");

  const { options: branchOptions } = useBranchesOptions();
  const branches = branchOptions.map((b) => ({ id: b.id, name: b.name }));

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { items, total, isLoading, error, refresh } = useReturnsList({
    page,
    pageSize,
    status: statusFilter,
    branchId: branchId || undefined,
    from: from || undefined,
    to: to || undefined,
    search: searchInput,
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

  void refresh;

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
        description="No tienes permiso para ver devoluciones."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="warning"
        title="Error al cargar devoluciones"
        description={error.message}
      />
    );
  }

  return (
    <CatalogShell
      title="Devoluciones"
      description="Historial de devoluciones registradas"
      toolbar={
        <ReturnsToolbar
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
        <ReturnsEmpty />
      ) : (
        <>
          <ReturnsTable
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
    </CatalogShell>
  );
}
