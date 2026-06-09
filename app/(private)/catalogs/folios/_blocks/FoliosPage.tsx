"use client";

import { useState, useMemo, useCallback } from "react";
import { useCurrentUser } from "../../../../_hooks/useCurrentUser";
import { useFolios } from "../_logic/hooks/useFolios";
import { useFolioMutations } from "../_logic/hooks/useFolioMutations";
import { FoliosTable } from "./FoliosTable";
import { FolioEditModal } from "./FolioEditModal";
import { CatalogShell } from "../../_blocks/CatalogShell";
import { CatalogToolbar } from "../../_blocks/CatalogToolbar";
import { CatalogPagination } from "../../_blocks/CatalogPagination";
import { CatalogEmpty } from "../../_blocks/CatalogEmpty";
import { CatalogError } from "../../_blocks/CatalogError";
import { ConfirmDialog } from "../../../../_components/molecules/ConfirmDialog/ConfirmDialog";
import { Skeleton } from "../../../../_components/atoms/Skeleton/Skeleton";
import { EmptyState } from "../../../../_components/molecules/EmptyState/EmptyState";
import { FolioCodeAlreadyInUseError } from "../_logic/errors";
import type { Folio } from "../_logic/types/domain";
import type { CreateFolioBody, UpdateFolioBody } from "../_logic/types/api";

type ModalMode = "create" | "edit";
interface ModalState {
  mode: ModalMode;
  entity: Folio | null;
}

export function FoliosPage() {
  const { can } = useCurrentUser();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [modalState, setModalState] = useState<ModalState | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { items, total, isLoading, error, refresh } = useFolios({ page, pageSize, includeInactive });
  const { isSaving, createOne, updateOne, softDeleteOne, reactivateOne, clearError } = useFolioMutations();

  const canRead = can("folios:read");
  const canWrite = can("folios:write");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleCreate = useCallback(() => {
    clearError();
    setCodeError(null);
    setMutationError(null);
    setModalState({ mode: "create", entity: null });
  }, [clearError]);

  const handleEdit = useCallback(
    (entity: Folio) => {
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
    async (data: CreateFolioBody | UpdateFolioBody) => {
      if (!modalState) return;
      try {
        if (modalState.mode === "create") {
          const result = await createOne(data as CreateFolioBody);
          if (result !== null) {
            refresh();
            setModalState(null);
            showToast("Folio creado.");
          }
        } else {
          if (!modalState.entity) return;
          const result = await updateOne(modalState.entity.id, data as UpdateFolioBody);
          if (result !== null) {
            refresh();
            setModalState(null);
            showToast("Folio actualizado.");
          }
        }
      } catch (err) {
        if (err instanceof FolioCodeAlreadyInUseError) {
          setCodeError("Este código ya está en uso.");
        } else {
          setMutationError((err as Error).message ?? "Error al guardar.");
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
        showToast("Folio desactivado.");
      }
    },
    [softDeleteOne, refresh, showToast]
  );

  const handleReactivate = useCallback(
    async (id: string) => {
      const result = await reactivateOne(id);
      if (result !== null) {
        refresh();
        showToast("Folio reactivado.");
      }
    },
    [reactivateOne, refresh, showToast]
  );

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
  }, []);

  const handlePageSizeChange = useCallback((ps: number) => {
    setPageSize(ps);
    setPage(1);
  }, []);

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
          description="No tienes permisos para ver los folios. Contacta a un administrador."
        />
      </div>
    );
  }

  return (
    <>
      <CatalogShell
        title="Folios"
        description="Gestiona los folios de documentos del sistema"
        toolbar={
          <CatalogToolbar
            canWrite={canWrite === true}
            onCreate={handleCreate}
            searchValue={search}
            onSearchChange={setSearch}
            includeInactive={includeInactive}
            onIncludeInactiveChange={(val) => { setIncludeInactive(val); setPage(1); }}
          />
        }
      >
        {error ? (
          <CatalogError onRetry={refresh} />
        ) : filteredItems.length === 0 && !isLoading ? (
          <CatalogEmpty
            canWrite={canWrite === true}
            onCreate={handleCreate}
            filtered={search !== ""}
            onClearFilters={() => setSearch("")}
          />
        ) : (
          <FoliosTable
            items={filteredItems}
            canWrite={canWrite === true}
            isLoading={isLoading}
            onEdit={handleEdit}
            onSoftDelete={(id) => setConfirmDeleteId(id)}
            onReactivate={handleReactivate}
          />
        )}

        <CatalogPagination
          page={page}
          pageSize={pageSize}
          total={total}
          count={filteredItems.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </CatalogShell>

      <FolioEditModal
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
        title="Desactivar folio"
        description="Esta acción marcará el folio como inactivo. Podrá reactivarse posteriormente."
        confirmLabel="Desactivar"
        cancelLabel="Cancelar"
        onConfirm={() => { if (confirmDeleteId) handleSoftDelete(confirmDeleteId); }}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-3 rounded-xl bg-surface-container-high text-on-surface text-body-md shadow-lg z-50">
          {toast}
        </div>
      )}
    </>
  );
}
