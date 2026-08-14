"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useDebounce } from "../../../_hooks/useDebounce";
import { useBranchesOptions } from "../../inventory/_logic/hooks/useBranchesOptions";
import { useAccountStatementsSummary } from "../_logic/hooks/useAccountStatementsSummary";
import { StatementToolbar } from "./StatementToolbar";
import { SummaryTable } from "./SummaryTable";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { PageShell } from "../../../_components/organisms/PageShell";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { PageLoading } from "../../../_components/molecules/PageLoading/PageLoading";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";

export function AccountStatementsPage() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canRead = can("reports:account_statements_read");
  const isBypass = can("branches:access_all");
  const { options: branches } = useBranchesOptions();

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchRaw, setSearchRaw] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyWithBalance, setOnlyWithBalance] = useState(false);
  const [branchId, setBranchId] = useState("");
  const [toastError, setToastError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchRaw, 300);
  const search = debouncedSearch.trim().length >= 2 ? debouncedSearch.trim() : undefined;

  const { report, isLoading, error, isExporting, isExportingXlsx, exportPdf, exportXlsx } = useAccountStatementsSummary({
    page,
    pageSize,
    search,
    from: from || undefined,
    to: to || undefined,
    onlyWithBalance,
    branchId: branchId || undefined,
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

  function handleReset() {
    setSearchRaw("");
    setFrom("");
    setTo("");
    setOnlyWithBalance(false);
    setBranchId("");
    setPage(1);
  }

  if (canRead === "loading") {
    return <PageLoading />;
  }

  if (canRead === false) {
    return (
      <EmptyState
        icon="block"
        title="Sin acceso"
        description="No tienes permiso para ver los estados de cuenta."
      />
    );
  }

  return (
    <PageShell title="Estados de Cuenta" backHref="/reports">
      <div className="flex flex-col gap-4">
        <StatementToolbar
          search={searchRaw}
          onSearchChange={(v) => { setSearchRaw(v); setPage(1); }}
          from={from}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          to={to}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onlyWithBalance={onlyWithBalance}
          onOnlyWithBalanceChange={(v) => { setOnlyWithBalance(v); setPage(1); }}
          branchId={branchId}
          onBranchIdChange={(v) => { setBranchId(v); setPage(1); }}
          branches={branches}
          showBranchFilter={isBypass === true}
          isExporting={isExporting}
          onExportPdf={handleExportPdf}
          isExportingXlsx={isExportingXlsx}
          onExportXlsx={handleExportXlsx}
          onReset={handleReset}
        />

        {error && (
          <div className="bg-error-container/20 rounded px-4 py-3 text-body-sm text-error">
            {error.message}
          </div>
        )}

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !report || report.items.length === 0 ? (
          <EmptyState
            icon="summarize"
            title="Sin resultados"
            description="No se encontraron clientes con los filtros seleccionados."
          />
        ) : (
          <>
            <SummaryTable
              rows={report.items}
              onRowClick={(id) => router.push(`/reports/account-statements/${id}`)}
            />
            <CatalogPagination
              page={page}
              pageSize={pageSize}
              total={report.total}
              count={report.items.length}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          </>
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
