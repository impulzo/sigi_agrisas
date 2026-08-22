"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "../../../_components/atoms/Icon/Icon";
import { Button } from "../../../_components/atoms/Button/Button";

const ROLE_NAME_REGEX = /^[a-z][a-z0-9_]{1,31}$/;

interface RoleCreateModalProps {
  open: boolean;
  isSaving: boolean;
  error: string | null;
  onSubmit: (data: { name: string; description?: string }) => void;
  onClose: () => void;
}

export function RoleCreateModal({ open, isSaving, error, onSubmit, onClose }: RoleCreateModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

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
    if (open) {
      setName("");
      setDescription("");
      setNameError(null);
    }
  }, [open]);

  function handleSubmit() {
    const normalized = name.trim().toLowerCase();
    if (!ROLE_NAME_REGEX.test(normalized)) {
      setNameError("Debe empezar con letra minúscula y usar sólo minúsculas, números y guion bajo (2-32 caracteres)");
      return;
    }
    setNameError(null);
    onSubmit({ name: normalized, description: description.trim() || undefined });
  }

  const displayError = nameError ?? error;

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg bg-surface-container p-0 shadow-lg w-full max-w-lg backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
        <h2 className="text-title-md font-semibold text-on-surface">Nuevo Rol</h2>
        <Button type="button" variant="text" size="sm" onClick={onClose} className="!px-1.5">
          <Icon name="close" size={20} />
        </Button>
      </div>

      <div className="px-6 py-5 space-y-5">
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="role-name">Nombre</label>
          <input
            id="role-name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameError(null); }}
            placeholder="ej. supervisor_almacen"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {displayError && <p className="text-label-sm text-error mt-1">{displayError}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="role-description">Descripción</label>
          <textarea
            id="role-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
        <Button type="button" variant="outlined" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="filled"
          onClick={handleSubmit}
          disabled={!name.trim() || isSaving}
          loading={isSaving}
        >
          {isSaving ? "Guardando..." : "Crear"}
        </Button>
      </div>
    </dialog>
  );
}
