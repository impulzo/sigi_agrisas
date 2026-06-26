"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { usePaymentsList } from "../_logic/hooks/usePaymentsList";
import { useBranchesOptions } from "../../inventory/_logic/hooks/useBranchesOptions";
import { CatalogShell } from "../../catalogs/_blocks/CatalogShell";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { PaymentsToolbar } from "./PaymentsToolbar";
import { PaymentsTable } from "./PaymentsTable";
import { PaymentsEmpty } from "./PaymentsEmpty";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import type { PaymentStatus } from "../_logic/types/domain";

export function PaymentsListPage() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canRead = can("payments:read");
  const isBypass = can("branches:access_all");

  const { options: branchOptions } = useBranchesOptions();
  const branches = branchOptions.map((b) => ({ id: b.id, name: b.name }));

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { items, total, isLoading, error } = usePaymentsList({
    page,
    pageSize,
    status: status || undefined,
    branchId: branchId || undefined,
    from: from || undefined,
    to: to || undefined,
    search: searchInput,
  });

  function handleReset() {
    setSearchInput("");
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
        description="No tienes permiso para ver abonos."
      />
    );
  }

  if (error) {
    return (
      <EmptyState
        icon="warning"
        title="Error al cargar abonos"
        description={error.message}
      />
    );
  }

  return (
    <CatalogShell
      title="Abonos"
      description="Historial de abonos registrados"
      toolbar={
        <PaymentsToolbar
          search={searchInput}
          onSearchChange={(v) => { setSearchInput(v); setPage(1); }}
          branchId={branchId}
          onBranchChange={(v) => { setBranchId(v); setPage(1); }}
          branches={branches}
          showBranchFilter={isBypass === true}
          status={status}
          onStatusChange={(v) => { setStatus(v); setPage(1); }}
          from={from}
          to={to}
          onFromChange={(v) => { setFrom(v); setPage(1); }}
          onToChange={(v) => { setTo(v); setPage(1); }}
          onReset={handleReset}
        />
      }
    >
      {!isLoading && items.length === 0 ? (
        <PaymentsEmpty />
      ) : (
        <>
          <PaymentsTable
            items={items}
            isLoading={isLoading}
            showBranch={isBypass === true}
            onEnter={(p) => router.push(`/payments/${p.id}`)}
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
