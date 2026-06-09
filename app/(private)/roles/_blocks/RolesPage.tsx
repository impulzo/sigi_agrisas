"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useCurrentUser } from "../../../_hooks/useCurrentUser";
import { useRoles } from "../_logic/hooks/useRoles";
import { useRolePermissions } from "../_logic/hooks/useRolePermissions";
import { usePermissionsCatalog } from "../_logic/hooks/usePermissionsCatalog";
import { RolesList } from "./RolesList";
import { RoleDetailHeader } from "./RoleDetailHeader";
import { RolePermissionsEditor } from "./RolePermissionsEditor";
import { EmptyState } from "../../../_components/molecules/EmptyState/EmptyState";
import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { grantPermissionToRole } from "../_logic/services/grantPermissionToRole";
import { revokePermissionFromRole } from "../_logic/services/revokePermissionFromRole";

export function RolesPage() {
  const { can } = useCurrentUser();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [staged, setStaged] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { roles, isLoading: rolesLoading, error: rolesError, refresh: refreshRoles } = useRoles();
  const {
    permissions: rolePermissions,
    isLoading: rolePermsLoading,
    refresh: refreshRolePerms,
  } = useRolePermissions(selectedRoleId);
  const { permissions: catalog, isLoading: catalogLoading } = usePermissionsCatalog();

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (!rolePermsLoading) {
      setStaged(new Set(rolePermissions.map((p) => p.id)));
      setMutationError(null);
    }
  }, [rolePermissions, rolePermsLoading]);

  const originalIds = useMemo(
    () => new Set(rolePermissions.map((p) => p.id)),
    [rolePermissions]
  );

  const isDirty = useMemo(() => {
    if (staged.size !== originalIds.size) return true;
    for (const id of staged) {
      if (!originalIds.has(id)) return true;
    }
    return false;
  }, [staged, originalIds]);

  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  const handleSelectRole = useCallback((id: string) => {
    setSelectedRoleId(id);
  }, []);

  const handleToggle = useCallback((permId: string) => {
    setStaged((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  }, []);

  const handleDiscard = useCallback(() => {
    setStaged(new Set(rolePermissions.map((p) => p.id)));
    setMutationError(null);
  }, [rolePermissions]);

  const handleSave = useCallback(async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    setMutationError(null);

    const toGrant = catalog.filter((p) => staged.has(p.id) && !originalIds.has(p.id));
    const toRevoke = catalog.filter((p) => !staged.has(p.id) && originalIds.has(p.id));

    try {
      await Promise.all([
        ...toGrant.map((p) => grantPermissionToRole(selectedRoleId, p.key)),
        ...toRevoke.map((p) => revokePermissionFromRole(selectedRoleId, p.id)),
      ]);
      refreshRolePerms();
    } catch (err: unknown) {
      setMutationError(err instanceof Error ? err.message : "Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  }, [selectedRoleId, staged, originalIds, catalog, refreshRolePerms]);

  const canAccess = can("roles:read");
  const canWrite = can("roles:write");

  if (canAccess === "loading") {
    return (
      <div className="flex gap-6 h-full" aria-busy="true">
        <div className="w-[280px] flex-shrink-0 flex flex-col gap-2 p-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} height={64} className="w-full" />
          ))}
        </div>
        <div className="flex-1 flex flex-col gap-4 p-4">
          <Skeleton height={40} width="50%" />
          <Skeleton height={200} className="w-full" />
        </div>
      </div>
    );
  }

  if (canAccess === false) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <EmptyState
          icon="lock"
          title="Sin acceso"
          description="No tienes permisos para administrar roles. Contacta a un administrador."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-headline-lg font-semibold text-on-surface">Roles y Permisos</h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Gestiona el acceso de los usuarios a los diferentes módulos
          </p>
        </div>
        {canWrite === true && (
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity"
          >
            <Icon name="add" size={18} />
            Crear Nuevo Rol
          </button>
        )}
      </div>

      <div className="flex gap-6 min-h-[70vh]">
        {/* Master pane */}
        <aside className="w-[280px] flex-shrink-0 bg-surface-container-low rounded-2xl border border-outline-variant overflow-y-auto">
          <div className="px-4 py-4 border-b border-outline-variant">
            <h2 className="text-title-md font-semibold text-on-surface">Roles</h2>
          </div>
          {rolesError ? (
            <div className="p-4 flex flex-col gap-2">
              <p className="text-body-md text-error">No se pudo cargar la lista de roles</p>
              <button
                type="button"
                onClick={refreshRoles}
                className="text-label-lg text-primary underline underline-offset-2"
              >
                Reintentar
              </button>
            </div>
          ) : (
            <RolesList
              roles={roles}
              selectedRoleId={selectedRoleId}
              onSelect={handleSelectRole}
              isLoading={rolesLoading}
            />
          )}
        </aside>

        {/* Detail pane */}
        <section className="flex-1 flex flex-col bg-surface-container-low rounded-2xl border border-outline-variant overflow-hidden">
          <RoleDetailHeader role={selectedRole} />

          {selectedRole && (
            <>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                {mutationError && (
                  <p className="text-body-md text-error bg-error-container px-4 py-2 rounded-lg mt-4">
                    {mutationError}
                  </p>
                )}
                <RolePermissionsEditor
                  catalog={catalog}
                  staged={staged}
                  onToggle={handleToggle}
                  isLoading={rolePermsLoading || catalogLoading}
                  disabled={isSaving || canWrite === false}
                />
              </div>

              {/* Footer actions */}
              <div className="border-t border-outline-variant px-6 py-4 flex items-center justify-end gap-3 bg-surface-container-lowest">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={!isDirty || isSaving}
                  className="px-5 py-2.5 rounded-xl border border-outline text-label-lg text-on-surface font-medium transition-colors hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-label-lg font-medium transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Icon name="progress_activity" size={16} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambios"
                  )}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
