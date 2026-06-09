"use client";

import { useState } from "react";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useQuotesList } from "../_logic/hooks/useQuotesList";
import { CatalogShell } from "../../catalogs/_blocks/CatalogShell";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { QuotesToolbar } from "./QuotesToolbar";
import { QuotesTable } from "./QuotesTable";
import { QuotesEmpty } from "./QuotesEmpty";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { useBranchesOptions } from "../../inventory/_logic/hooks/useBranchesOptions";
import type { QuoteListFilters } from "../_logic/types/domain";

export function QuotesListPage() {
  const { can } = useCurrentUser();
  const canRead = can("quotes:read");
  const isBypass = can("branches:access_all");

  const { options: branchOptions } = useBranchesOptions();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<QuoteListFilters["status"]>("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const filters: QuoteListFilters = {
    page,
    pageSize,
    branchId: branchId || undefined,
    status: status || undefined,
    from: from || undefined,
    to: to || undefined,
    search: search || undefined,
  };

  const { items, total, isLoading, error, refresh } = useQuotesList(filters);

  function handleReset() {
    setSearch("");
    setBranchId("");
    setStatus("");
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
        description="No tienes permiso para ver cotizaciones."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="warning"
        title="Error al cargar cotizaciones"
        description={error.message}
      />
    );
  }

  return (
    <CatalogShell
      title="Cotizaciones"
      description="Listado de cotizaciones emitidas"
      toolbar={
        <QuotesToolbar
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          branchId={branchId}
          onBranchChange={(v) => { setBranchId(v); setPage(1); }}
          branches={branchOptions.map((b) => ({ id: b.id, name: b.name }))}
          showBranchFilter={isBypass === true}
          status={status ?? ""}
          onStatusChange={(v) => { setStatus(v as QuoteListFilters["status"]); setPage(1); }}
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onReset={handleReset}
          canCreate={can("quotes:create") === true}
        />
      }
    >
      {items.length === 0 && !isLoading ? (
        <QuotesEmpty onRefresh={refresh} />
      ) : (
        <>
          <QuotesTable items={items} isLoading={isLoading} showBranch={isBypass === true} />
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
