"use client";

import { useState, useCallback } from "react";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useDebounce } from "../../../../_hooks/useDebounce";
import { useVehicles } from "../_logic/hooks/useVehicles";
import { useVehicleMutations } from "../_logic/hooks/useVehicleMutations";
import { VehiclesTable } from "./VehiclesTable";
import { VehicleEditModal } from "./VehicleEditModal";
import { PageShell } from "../../../../_components/organisms/PageShell";
import { CatalogToolbar } from "../../_blocks/CatalogToolbar";
import { CatalogPagination } from "../../_blocks/CatalogPagination";
import { CatalogEmpty } from "../../_blocks/CatalogEmpty";
import { CatalogError } from "../../_blocks/CatalogError";
import { ConfirmDialog } from "../../../../_components/molecules/ConfirmDialog/ConfirmDialog";
import { Skeleton } from "../../../../_components/atoms/Skeleton/Skeleton";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { VehicleCodeAlreadyInUseError } from "../_logic/errors";
import type { Vehicle } from "../_logic/types/domain";
import type { CreateVehicleBody, UpdateVehicleBody } from "../_logic/types/api";

type ModalMode = "create" | "edit";

interface ModalState {
  mode: ModalMode;
  entity: Vehicle | null;
}

export function VehiclesPage() {
  const { can } = useCurrentUser();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { items, total, isLoading, error, refresh } = useVehicles({
    page,
    pageSize,
    search: effectiveSearch,
    includeInactive,
  });
  const { isSaving, createOne, updateOne, softDeleteOne, reactivateOne, clearError } = useVehicleMutations();

  const canRead = can("vehicles:read");
  const canWrite = can("vehicles:write");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    setPage(1);
  }, []);

  const handleCreate = useCallback(() => {
    clearError();
    setCodeError(null);
    setMutationError(null);
    setModalState({ mode: "create", entity: null });
  }, [clearError]);

  const handleEdit = useCallback(
    (entity: Vehicle) => {
      clearError();
      setCodeError(null);
      setMutationError(null);
      setModalState({ mode: "edit", entity });
    },
    [clearError]
  );

  const handleCloseModal = useCallback(() => {
    setModalState(null);
    setCodeError(null);
    setMutationError(null);
  }, []);

  const handleSave = useCallback(
    async (data: CreateVehicleBody | UpdateVehicleBody) => {
      if (!modalState) return;
      setCodeError(null);
      try {
        if (modalState.mode === "create") {
          const result = await createOne(data as CreateVehicleBody);
          if (result !== null) {
            refresh();
            setModalState(null);
            showToast("Vehículo creado.");
          }
        } else {
          if (!modalState.entity) return;
          const result = await updateOne(modalState.entity.id, data as UpdateVehicleBody);
          if (result !== null) {
            refresh();
            setModalState(null);
            showToast("Vehículo actualizado.");
          }
        }
      } catch (err) {
        if (err instanceof VehicleCodeAlreadyInUseError) {
          setCodeError("Este código ya está en uso.");
        } else {
          setMutationError((err as Error).message ?? "Error al guardar vehículo.");
        }
      }
    },
    [modalState, createOne, updateOne, refresh, showToast]
  );

  const handleSoftDelete = useCallback(
    async (id: string) => {
      const ok = await softDeleteOne(id);
      if (ok) {
        setConfirmDeleteId(null);
        refresh();
        showToast("Vehículo desactivado.");
      }
    },
    [softDeleteOne, refresh, showToast]
  );

  const handleReactivate = useCallback(
    async (id: string) => {
      const result = await reactivateOne(id);
      if (result !== null) {
        refresh();
        showToast("Vehículo reactivado.");
      }
    },
    [reactivateOne, refresh, showToast]
  );

  if (canRead === "loading") {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton height={48} width="40%" />
        <Skeleton height={44} className="w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={56} className="w-full" />
        ))}
      </div>
    );
  }

  if (canRead === false) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <EmptyState
          icon="lock"
          title="Sin acceso a este catálogo"
          description="No tienes permisos para ver los vehículos. Contacta a un administrador."
        />
      </div>
    );
  }

  const filtered = trimmedSearch.length === 1;

  return (
    <>
      <PageShell
        title="Vehículos"
        description="Gestiona el catálogo de vehículos para carta porte"
        toolbar={
          <CatalogToolbar
            canWrite={canWrite === true}
            onCreate={handleCreate}
            searchValue={searchInput}
            onSearchChange={handleSearchChange}
            includeInactive={includeInactive}
            onIncludeInactiveChange={(val) => {
              setIncludeInactive(val);
              setPage(1);
            }}
            searchPlaceholder="Buscar por código, placa o aseguradora..."
            searchScope="server"
            createButtonLabel="Nuevo vehículo"
          />
        }
      >
        {error ? (
          <CatalogError onRetry={refresh} />
        ) : items.length === 0 && !isLoading ? (
          <CatalogEmpty
            canWrite={canWrite === true}
            onCreate={handleCreate}
            filtered={trimmedSearch.length >= 2}
            onClearFilters={() => setSearchInput("")}
          />
        ) : (
          <VehiclesTable
            items={items}
            canWrite={canWrite === true}
            isLoading={isLoading}
            onEdit={handleEdit}
            onSoftDelete={(id) => setConfirmDeleteId(id)}
            onReactivate={handleReactivate}
            onEnter={canWrite === true ? handleEdit : undefined}
          />
        )}

        <CatalogPagination
          page={page}
          pageSize={pageSize}
          total={total}
          count={items.length}
          onPageChange={setPage}
          onPageSizeChange={(ps) => {
            setPageSize(ps);
            setPage(1);
          }}
        />
      </PageShell>

      {filtered && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md bg-surface-container-high text-label-lg text-on-surface-variant shadow-md z-40">
          Mínimo 2 caracteres para buscar.
        </div>
      )}

      <VehicleEditModal
        open={modalState !== null}
        mode={modalState?.mode ?? "create"}
        entity={modalState?.entity ?? null}
        isSaving={isSaving}
        codeError={codeError}
        mutationError={mutationError}
        onSave={handleSave}
        onClose={handleCloseModal}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Desactivar vehículo"
        description="Esta acción marcará el vehículo como inactivo. Podrá reactivarse posteriormente."
        confirmLabel="Desactivar"
        cancelLabel="Cancelar"
        onConfirm={() => {
          if (confirmDeleteId) handleSoftDelete(confirmDeleteId);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-md bg-surface-container-high text-on-surface text-body-md shadow-lg z-50">
          {toast}
        </div>
      )}
    </>
  );
}
