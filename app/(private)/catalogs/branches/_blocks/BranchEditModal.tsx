"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { Switch } from "../../../../_components/atoms/Switch/Switch";
import { createBranchSchema, updateBranchSchema } from "../_logic/schemas/branch.schema";
import type { Branch } from "../_logic/types/domain";
import type { CreateBranchBody, UpdateBranchBody } from "../_logic/types/api";

interface BranchEditModalProps {
  open: boolean;
  mode: "create" | "edit";
  entity: Branch | null;
  isSaving: boolean;
  codeError: string | null;
  mutationError: string | null;
  onSave: (data: CreateBranchBody | UpdateBranchBody) => void;
  onClose: () => void;
}

export function BranchEditModal({
  open,
  mode,
  entity,
  isSaving,
  codeError,
  mutationError,
  onSave,
  onClose,
}: BranchEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setCode("");
      setName("");
      setAddress("");
      setPhone("");
      setEmail("");
      setIsActive(true);
    } else if (entity) {
      setCode(entity.code);
      setName(entity.name);
      setAddress(entity.address ?? "");
      setPhone(entity.phone ?? "");
      setEmail(entity.email ?? "");
      setIsActive(entity.isActive);
    }
    setValidationErrors({});
  }, [open, mode, entity]);

  function validate(): boolean {
    if (mode === "create") {
      const result = createBranchSchema.safeParse({
        code,
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        isActive,
      });
      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = String(issue.path[0]);
          errs[key] = issue.message;
        }
        setValidationErrors(errs);
        return false;
      }
    } else {
      const result = updateBranchSchema.safeParse({
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        isActive,
      });
      if (!result.success) {
        const errs: Record<string, string> = {};
        for (const issue of result.error.issues) {
          const key = String(issue.path[0]);
          errs[key] = issue.message;
        }
        setValidationErrors(errs);
        return false;
      }
    }
    setValidationErrors({});
    return true;
  }

  function getDiff(): UpdateBranchBody {
    if (!entity) return {};
    const diff: UpdateBranchBody = {};
    if (name !== entity.name) diff.name = name;
    const addr = address || null;
    if (addr !== entity.address) diff.address = addr;
    const ph = phone || null;
    if (ph !== entity.phone) diff.phone = ph;
    const em = email || null;
    if (em !== entity.email) diff.email = em;
    if (isActive !== entity.isActive) diff.isActive = isActive;
    return diff;
  }

  const isCreateMode = mode === "create";
  const isDirty =
    isCreateMode
      ? code !== "" || name !== "" || address !== "" || phone !== "" || email !== "" || !isActive
      : entity !== null &&
        (name !== entity.name ||
          (address || null) !== entity.address ||
          (phone || null) !== entity.phone ||
          (email || null) !== entity.email ||
          isActive !== entity.isActive);

  const isDiffEmpty = mode === "edit" && Object.keys(getDiff()).length === 0;

  function handleSave() {
    if (!validate()) return;
    if (isCreateMode) {
      onSave({
        code,
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        isActive,
      });
    } else {
      const diff = getDiff();
      if (Object.keys(diff).length === 0) return;
      onSave(diff);
    }
  }

  const title = isCreateMode ? "Nueva Sucursal" : "Editar Sucursal";

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl bg-surface-container p-0 shadow-lg w-full max-w-lg backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
        <h2 className="text-title-md font-semibold text-on-surface">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high"
        >
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="branch-code">
            Código
          </label>
          <input
            id="branch-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={!isCreateMode}
            placeholder="EJ. CDMX_01"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-surface-container"
          />
          {(validationErrors.code || codeError) && (
            <p className="text-label-sm text-error mt-1">
              {validationErrors.code ?? codeError}
            </p>
          )}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="branch-name">
            Nombre
          </label>
          <input
            id="branch-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la sucursal"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.name && (
            <p className="text-label-sm text-error mt-1">{validationErrors.name}</p>
          )}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="branch-address">
            Dirección
          </label>
          <textarea
            id="branch-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Dirección de la sucursal (opcional)"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          {validationErrors.address && (
            <p className="text-label-sm text-error mt-1">{validationErrors.address}</p>
          )}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="branch-phone">
            Teléfono
          </label>
          <input
            id="branch-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.phone && (
            <p className="text-label-sm text-error mt-1">{validationErrors.phone}</p>
          )}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="branch-email">
            Email
          </label>
          <input
            id="branch-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email de contacto (opcional)"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.email && (
            <p className="text-label-sm text-error mt-1">{validationErrors.email}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            aria-label="Activo"
            id="branch-isActive"
          />
          <label htmlFor="branch-isActive" className="text-label-lg text-on-surface-variant cursor-pointer">
            Activo
          </label>
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
          disabled={!isDirty || isDiffEmpty || isSaving || Object.keys(validationErrors).length > 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Icon name="progress_activity" size={16} className="animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar"
          )}
        </button>
      </div>
    </dialog>
  );
}
