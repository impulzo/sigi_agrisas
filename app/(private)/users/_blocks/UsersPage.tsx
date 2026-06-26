"use client";

import { useState, useMemo, useCallback } from "react";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useUsers } from "../_logic/hooks/useUsers";
import { useRolesCatalog } from "../_logic/hooks/useRolesCatalog";
import { useUserMutations } from "../_logic/hooks/useUserMutations";
import { UsersTable } from "./UsersTable";
import { UsersToolbar } from "./UsersToolbar";
import { UsersPagination } from "./UsersPagination";
import { UserEditModal } from "./UserEditModal";
import { UsersEmpty } from "./UsersEmpty";
import { UsersError } from "./UsersError";
import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { ConfirmDialog } from "../../../_components/molecules/ConfirmDialog/ConfirmDialog";
import type { User } from "../_logic/types/domain";

export function UsersPage() {
  const { userId: currentUserId, can } = useCurrentUser();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [activeRoles, setActiveRoles] = useState<string[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { users, total, isLoading, error, refresh } = useUsers({ page, pageSize });
  const { roles: catalog, isLoading: catalogLoading } = useRolesCatalog();
  const { isSaving, mutationError, clearError, saveUserDiff, removeUser } = useUserMutations();

  const availableRoles = useMemo(() => {
    const roleSet = new Set<string>();
    users.forEach((u) => u.roles.forEach((r) => roleSet.add(r)));
    return Array.from(roleSet).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (search) {
        const q = search.toLowerCase();
        const matchName = u.name?.toLowerCase().includes(q) ?? false;
        const matchEmail = u.email.toLowerCase().includes(q);
        if (!matchName && !matchEmail) return false;
      }
      if (activeRoles.length > 0) {
        if (!activeRoles.some((r) => u.roles.includes(r))) return false;
      }
      return true;
    });
  }, [users, search, activeRoles]);

  const hasActiveFilters = search !== "" || activeRoles.length > 0;

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setActiveRoles([]);
  }, []);

  const handleToggleRole = useCallback((role: string) => {
    setActiveRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }, []);

  const handlePageChange = useCallback((p: number) => {
    setPage(p);
    setSearch("");
    setActiveRoles([]);
  }, []);

  const handlePageSizeChange = useCallback((ps: number) => {
    setPageSize(ps);
    setPage(1);
  }, []);

  const handleEdit = useCallback((user: User) => {
    clearError();
    setEditingUser(user);
  }, [clearError]);

  const handleCloseModal = useCallback(() => setEditingUser(null), []);

  const handleSave = useCallback(
    async (params: {
      name: string;
      email: string;
      avatarUrlInput: string;
      avatarReset: boolean;
      stagedRoleIds: Set<string>;
    }) => {
      if (!editingUser) return;
      const result = await saveUserDiff({
        userId: editingUser.id,
        original: editingUser,
        edited: params,
        catalog,
      });
      if (result !== null) {
        setEditingUser(null);
        refresh();
      }
    },
    [editingUser, saveUserDiff, catalog, refresh]
  );

  const handleDelete = useCallback((user: User) => {
    setDeleteError(null);
    setDeletingUser(user);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingUser) return;
    const ok = await removeUser(deletingUser.id);
    if (ok) {
      setDeletingUser(null);
      refresh();
    } else {
      setDeleteError("No se pudo eliminar el usuario");
    }
  }, [deletingUser, removeUser, refresh]);

  const handleCancelDelete = useCallback(() => {
    setDeletingUser(null);
    setDeleteError(null);
  }, []);

  const canAccess = can("users:read");
  const canWrite = can("users:write");

  if (canAccess === "loading") {
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

  if (canAccess === false) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <EmptyState
          icon="lock"
          title="Sin acceso"
          description="No tienes permisos para administrar usuarios. Contacta a un administrador."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-surface">Administración de Usuarios</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Gestiona los usuarios registrados en el sistema
          </p>
        </div>
      </div>

      <div className="bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
        <div className="px-4 py-4 border-b border-outline-variant">
          <UsersToolbar
            search={search}
            onSearchChange={setSearch}
            activeRoles={activeRoles}
            availableRoles={availableRoles}
            onToggleRole={handleToggleRole}
            onClearFilters={handleClearFilters}
          />
        </div>

        {error ? (
          <UsersError onRetry={refresh} />
        ) : filteredUsers.length === 0 && !isLoading ? (
          <UsersEmpty filtered={hasActiveFilters} onClearFilters={handleClearFilters} />
        ) : (
          <UsersTable
            users={filteredUsers}
            currentUserId={currentUserId ?? ""}
            canWrite={canWrite === true}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onEnter={canWrite === true ? handleEdit : undefined}
          />
        )}

        <UsersPagination
          page={page}
          pageSize={pageSize}
          total={total}
          count={filteredUsers.length}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      <UserEditModal
        open={editingUser !== null}
        user={editingUser}
        catalog={catalog}
        catalogLoading={catalogLoading}
        isSaving={isSaving}
        mutationError={mutationError}
        onSave={handleSave}
        onClose={handleCloseModal}
      />

      <ConfirmDialog
        open={deletingUser !== null}
        title="Eliminar usuario"
        description={
          deletingUser
            ? `Esta acción no se puede deshacer. Se eliminará al usuario ${deletingUser.email} y se removerán todas sus asignaciones de rol.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {deleteError && (
        <p className="text-body-md text-error bg-error-container px-4 py-2 rounded-lg mt-2">
          {deleteError}
        </p>
      )}
    </div>
  );
}
