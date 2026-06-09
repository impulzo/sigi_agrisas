"use client";

import { useState, useEffect, useRef } from "react";
import { Avatar } from "../../../_components/atoms/Avatar/Avatar";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { Skeleton } from "../../../_components/atoms/Skeleton/Skeleton";
import { updateUserSchema } from "../_logic/schemas/updateUser.schema";
import type { User } from "../_logic/types/domain";
import type { RoleOption } from "../_logic/services/listAvailableRoles";

interface UserEditModalProps {
  open: boolean;
  user: User | null;
  catalog: RoleOption[];
  catalogLoading: boolean;
  isSaving: boolean;
  mutationError: string | null;
  onSave: (params: {
    name: string;
    email: string;
    avatarUrlInput: string;
    avatarReset: boolean;
    stagedRoleIds: Set<string>;
  }) => void;
  onClose: () => void;
}

export function UserEditModal({
  open,
  user,
  catalog,
  catalogLoading,
  isSaving,
  mutationError,
  onSave,
  onClose,
}: UserEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [avatarReset, setAvatarReset] = useState(false);
  const [stagedRoleIds, setStagedRoleIds] = useState<Set<string>>(new Set());
  const [validationErrors, setValidationErrors] = useState<{ email?: string; avatarUrl?: string }>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => { e.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  useEffect(() => {
    if (!user || !open) return;
    setName(user.name ?? "");
    setEmail(user.email);
    setAvatarUrlInput("");
    setAvatarReset(false);
    setValidationErrors({});
    const initialRoleIds = new Set(
      catalog.filter((r) => user.roles.includes(r.name)).map((r) => r.id)
    );
    setStagedRoleIds(initialRoleIds);
  }, [user, open, catalog]);

  if (!user) return null;

  const originalRoleIds = new Set(
    catalog.filter((r) => user.roles.includes(r.name)).map((r) => r.id)
  );
  const isDirty =
    name !== (user.name ?? "") ||
    email !== user.email ||
    avatarReset ||
    avatarUrlInput !== "" ||
    stagedRoleIds.size !== originalRoleIds.size ||
    [...stagedRoleIds].some((id) => !originalRoleIds.has(id));

  function validate(): boolean {
    const partial = {
      name: name || undefined,
      email: email !== user!.email ? email : undefined,
      avatarUrl: avatarUrlInput || undefined,
    };
    const result = updateUserSchema.safeParse(partial);
    if (!result.success) {
      const errs: { email?: string; avatarUrl?: string } = {};
      for (const issue of result.error.issues) {
        if (issue.path[0] === "email") errs.email = issue.message;
        if (issue.path[0] === "avatarUrl") errs.avatarUrl = issue.message;
      }
      setValidationErrors(errs);
      return false;
    }
    setValidationErrors({});
    return true;
  }

  function handleSave() {
    if (!validate()) return;
    onSave({ name, email, avatarUrlInput, avatarReset, stagedRoleIds });
  }

  function toggleRole(roleId: string) {
    setStagedRoleIds((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl bg-surface-container p-0 shadow-lg w-full max-w-lg backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
        <h2 className="text-title-md font-semibold text-on-surface">Editar Usuario</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <Avatar
            src={avatarReset ? undefined : (avatarUrlInput || user.avatarUrl)}
            alt={user.name ?? user.email}
            size="lg"
            fallbackInitials={(user.name ?? user.email)[0].toUpperCase()}
          />
          <div className="flex-1">
            <p className="text-label-lg text-on-surface-variant mb-1">Foto de perfil (URL)</p>
            <input
              type="url"
              value={avatarUrlInput}
              onChange={(e) => { setAvatarUrlInput(e.target.value); setAvatarReset(false); }}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {validationErrors.avatarUrl && (
              <p className="text-label-sm text-error mt-1">{validationErrors.avatarUrl}</p>
            )}
            <button
              type="button"
              onClick={() => { setAvatarUrlInput(""); setAvatarReset(true); }}
              className="mt-1.5 text-label-sm text-primary underline underline-offset-2"
            >
              Resetear a Gravatar
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="edit-name">
            Nombre
          </label>
          <input
            id="edit-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="edit-email">
            Email
          </label>
          <input
            id="edit-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.email && (
            <p className="text-label-sm text-error mt-1">{validationErrors.email}</p>
          )}
        </div>

        {/* Roles */}
        <div>
          <p className="text-label-lg text-on-surface-variant mb-2">Roles</p>
          {catalogLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} height={36} className="w-full" />)}
            </div>
          ) : (
            <div className="space-y-2">
              {catalog.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-container-low cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={stagedRoleIds.has(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-body-md text-on-surface">{role.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {mutationError && (
          <p className="text-body-md text-error bg-error-container px-4 py-2 rounded-lg">
            {mutationError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl border border-outline text-label-lg text-on-surface font-medium hover:bg-surface-container-high transition-colors disabled:opacity-40"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || isSaving || Object.keys(validationErrors).length > 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
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
    </dialog>
  );
}
