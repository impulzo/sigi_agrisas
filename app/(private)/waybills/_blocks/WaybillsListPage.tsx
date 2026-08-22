"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useWaybillsList } from "../_logic/hooks/useWaybillsList";
import { PageShell } from "../../../_components/organisms/PageShell";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { WaybillsToolbar } from "./WaybillsToolbar";
import { WaybillsTable } from "./WaybillsTable";
import { WaybillsEmpty } from "./WaybillsEmpty";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { CreateButton } from "../../../_components/molecules/CreateButton/CreateButton";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";
import { useBranchesOptions } from "../../../_hooks/useBranchesOptions";
import type { WaybillStatus, WaybillType } from "../_logic/types/api";

export function WaybillsListPage() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const canRead = can("waybills:read");
  const canWrite = can("waybills:write");
  const isBypass = can("branches:access_all");

  const { options: branchOptions } = useBranchesOptions();
  const branches = branchOptions.map((b) => ({ id: b.id, name: b.name }));
  const branchNameById = useMemo(
    () => Object.fromEntries(branchOptions.map((b) => [b.id, b.name])),
    [branchOptions]
  );

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [branchId, setBranchId] = useState("");
  const [statusFilter, setStatusFilter] = useState<WaybillStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<WaybillType[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { items, total, isLoading, error } = useWaybillsList({
    page,
    pageSize,
    status: statusFilter,
    type: typeFilter,
    branchId: branchId || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  function handleReset() {
    setBranchId("");
    setStatusFilter([]);
    setTypeFilter([]);
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
    return <EmptyState icon="block" title="Sin acceso" description="No tienes permiso para ver traspasos." />;
  }

  if (error) {
    return <EmptyState icon="warning" title="Error al cargar traspasos" description={error.message} />;
  }

  return (
    <PageShell
      title="Traspasos"
      description="Traspasos de mercancía entre sucursales, simples o con Carta Porte"
      toolbar={
        <div className="flex flex-wrap items-center justify-between gap-3 w-full">
          <WaybillsToolbar
            branchId={branchId}
            onBranchChange={(v) => {
              setBranchId(v);
              setPage(1);
            }}
            branches={branches}
            showBranchFilter={isBypass === true}
            statusFilter={statusFilter}
            onStatusChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            typeFilter={typeFilter}
            onTypeChange={(v) => {
              setTypeFilter(v);
              setPage(1);
            }}
            from={from}
            to={to}
            onFromChange={(v) => {
              setFrom(v);
              setPage(1);
            }}
            onToChange={(v) => {
              setTo(v);
              setPage(1);
            }}
            onReset={handleReset}
          />
          {canWrite === true && <CreateButton label="Nuevo traspaso" href="/waybills/new" />}
        </div>
      }
    >
      {!isLoading && items.length === 0 ? (
        <WaybillsEmpty />
      ) : (
        <>
          <WaybillsTable
            items={items}
            isLoading={isLoading}
            branchNameById={branchNameById}
            onEnter={(w) => router.push(`/waybills/${w.id}`)}
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
