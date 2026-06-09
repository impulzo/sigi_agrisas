"use client";

import { useState, useCallback } from "react";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useDebounce } from "../../../_hooks/useDebounce";
import { useBranchInventory } from "../_logic/hooks/useBranchInventory";
import { useBranchesOptions } from "../_logic/hooks/useBranchesOptions";
import { useInventoryMutations } from "../_logic/hooks/useInventoryMutations";
import { InventoryTable } from "./InventoryTable";
import { InventoryAssignModal } from "./InventoryAssignModal";
import { StockAdjustModal } from "./StockAdjustModal";
import { InventoryEditModal } from "./InventoryEditModal";
import { CatalogPagination } from "../../catalogs/_blocks/CatalogPagination";
import { Switch } from "../../../_components/atoms/Switch/Switch";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import { ConfirmDialog } from "../../../_components/molecules/ConfirmDialog/ConfirmDialog";
import {
  InventoryAlreadyExistsError,
  InventoryTargetInvalidError,
  NegativeStockNotAllowedError,
} from "../_logic/errors";
import type { InventoryItem } from "../_logic/types/domain";

type ModalType = "assign" | "adjust" | "edit" | null;
interface ActiveModal { type: ModalType; item: InventoryItem | null; }

export function InventoryPage() {
  const { can } = useCurrentUser();
  const { options: branchOptions, isLoading: branchesLoading } = useBranchesOptions();

  const [branchId, setBranchId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const [belowReorder, setBelowReorder] = useState(false);
  const [modal, setModal] = useState<ActiveModal>({ type: null, item: null });
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const { items, total, isLoading, error, refresh } = useBranchInventory({
    branchId,
    page,
    pageSize,
    search: debouncedSearch.trim() || undefined,
    belowReorder,
  });

  const { isSaving, mutationError, clearError, assignOne, updateOne, adjustOne, removeOne } = useInventoryMutations();

  const canRead = can("inventory:read");
  const canWrite = can("inventory:write");

  const handleBranchChange = (val: string) => {
    setBranchId(val || undefined);
    setPage(1);
    setSearchInput("");
  };

  const handleSearchChange = useCallback((val: string) => {
    setSearchInput(val);
    setPage(1);
  }, []);

  const handleBelowReorderChange = useCallback((val: boolean) => {
    setBelowReorder(val);
    setPage(1);
  }, []);

  const handleAssign = useCallback(async (productId: string, quantity: number, reorderPoint: number) => {
    if (!branchId) return;
    setAssignError(null);
    try {
      await assignOne(branchId, { productId, quantity, reorderPoint });
      setModal({ type: null, item: null });
      refresh();
    } catch (err) {
      if (err instanceof InventoryAlreadyExistsError) setAssignError("Este producto ya está asignado a la sucursal.");
      else if (err instanceof InventoryTargetInvalidError) setAssignError("El producto no existe o está inactivo.");
      else setAssignError((err as Error).message ?? "Error al asignar.");
    }
  }, [branchId, assignOne, refresh]);

  const handleAdjust = useCallback(async (delta: number, reason?: string) => {
    if (!branchId || !modal.item) return;
    setAdjustError(null);
    try {
      await adjustOne(branchId, modal.item.productId, { delta, reason });
      setModal({ type: null, item: null });
      refresh();
    } catch (err) {
      if (err instanceof NegativeStockNotAllowedError) setAdjustError("El ajuste dejaría el stock en negativo.");
      else setAdjustError((err as Error).message ?? "Error al ajustar.");
    }
  }, [branchId, modal.item, adjustOne, refresh]);

  const handleEdit = useCallback(async (body: { quantity?: number; reservedQuantity?: number; reorderPoint?: number }) => {
    if (!branchId || !modal.item) return;
    await updateOne(branchId, modal.item.productId, body);
    setModal({ type: null, item: null });
    refresh();
  }, [branchId, modal.item, updateOne, refresh]);

  const handleRemove = useCallback(async () => {
    if (!branchId || !confirmRemoveId) return;
    const ok = await removeOne(branchId, confirmRemoveId);
    if (ok) { setConfirmRemoveId(null); refresh(); }
  }, [branchId, confirmRemoveId, removeOne, refresh]);

  if (canRead === false) {
    return <EmptyState icon="lock" title="Sin acceso" description="No tienes permiso para ver el inventario." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-headline-lg font-semibold text-on-surface">Inventario</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Gestión de stock por sucursal.</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-label-lg text-on-surface-variant">Sucursal:</label>
        <select
          value={branchId ?? ""}
          onChange={(e) => handleBranchChange(e.target.value)}
          disabled={branchesLoading}
          className="rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
        >
          <option value="">Selecciona una sucursal</option>
          {branchOptions.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {!branchId ? (
        <EmptyState icon="store" title="Selecciona una sucursal" description="Elige una sucursal para ver su inventario." />
      ) : (
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
          <div className="px-4 py-4 border-b border-outline-variant flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[180px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"><Icon name="search" size={18} /></span>
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Switch checked={belowReorder} onChange={handleBelowReorderChange} aria-label="Solo bajo punto de reorden" />
                <span className="text-label-lg text-on-surface-variant">Solo bajo punto de reorden</span>
              </label>
              {canWrite === true && (
                <button type="button" onClick={() => { clearError(); setAssignError(null); setModal({ type: "assign", item: null }); }} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity">
                  <Icon name="add" size={18} />Asignar producto
                </button>
              )}
            </div>
            {mutationError && <p className="text-label-sm text-error">{mutationError}</p>}
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
          ) : error ? (
            <div className="p-6 text-center"><p className="text-error text-body-md">{error}</p><button onClick={refresh} className="mt-2 text-label-lg text-primary hover:underline">Reintentar</button></div>
          ) : total === 0 ? (
            <div className="p-6">
              <EmptyState icon="inventory_2" title="Esta sucursal no tiene productos asignados" description={canWrite === true ? "Agrega el primer producto con el botón superior." : "No hay stock registrado para esta sucursal."} />
            </div>
          ) : (
            <>
              <InventoryTable
                items={items}
                canWrite={canWrite === true}
                onAdjust={(item) => { setAdjustError(null); setModal({ type: "adjust", item }); }}
                onEdit={(item) => setModal({ type: "edit", item })}
                onRemove={(item) => setConfirmRemoveId(item.productId)}
              />
              <CatalogPagination
                page={page}
                pageSize={pageSize}
                total={total}
                count={items.length}
                onPageChange={setPage}
                onPageSizeChange={(ps) => { setPageSize(ps); setPage(1); }}
              />
            </>
          )}
        </div>
      )}

      {modal.type === "assign" && branchId && (
        <InventoryAssignModal
          open
          branchId={branchId}
          isSaving={isSaving}
          assignError={assignError}
          onAssign={handleAssign}
          onClose={() => setModal({ type: null, item: null })}
        />
      )}

      {modal.type === "adjust" && modal.item && (
        <StockAdjustModal
          open
          item={modal.item}
          isSaving={isSaving}
          adjustError={adjustError}
          onAdjust={handleAdjust}
          onClose={() => setModal({ type: null, item: null })}
        />
      )}

      {modal.type === "edit" && modal.item && (
        <InventoryEditModal
          open
          item={modal.item}
          isSaving={isSaving}
          onSave={handleEdit}
          onClose={() => setModal({ type: null, item: null })}
        />
      )}

      <ConfirmDialog
        open={!!confirmRemoveId}
        title="¿Quitar este producto de la sucursal?"
        description="El registro de stock se eliminará permanentemente."
        confirmLabel="Quitar"
        onConfirm={handleRemove}
        onCancel={() => setConfirmRemoveId(null)}
      />
    </div>
  );
}
