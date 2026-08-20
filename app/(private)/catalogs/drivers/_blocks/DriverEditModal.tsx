"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { Button } from "../../../../_components/atoms/Button/Button";
import { Switch } from "../../../../_components/atoms/Switch/Switch";
import { createDriverSchema, updateDriverSchema } from "../_logic/schemas/driver.schema";
import type { Driver } from "../_logic/types/domain";
import type { CreateDriverBody, UpdateDriverBody } from "../_logic/types/api";

interface DriverEditModalProps {
  open: boolean;
  mode: "create" | "edit";
  entity: Driver | null;
  isSaving: boolean;
  codeError: string | null;
  mutationError: string | null;
  onSave: (data: CreateDriverBody | UpdateDriverBody) => void;
  onClose: () => void;
}

export function DriverEditModal({
  open,
  mode,
  entity,
  isSaving,
  codeError,
  mutationError,
  onSave,
  onClose,
}: DriverEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [rfc, setRfc] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [notes, setNotes] = useState("");
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
    const handleCancel = (e: Event) => { e.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setCode("");
      setName("");
      setRfc("");
      setLicenseNumber("");
      setNotes("");
      setIsActive(true);
    } else if (entity) {
      setCode(entity.code);
      setName(entity.name);
      setRfc(entity.rfc ?? "");
      setLicenseNumber(entity.licenseNumber);
      setNotes(entity.notes ?? "");
      setIsActive(entity.isActive);
    }
    setValidationErrors({});
  }, [open, mode, entity]);

  function validate(): boolean {
    const payload = {
      name,
      rfc: rfc || null,
      licenseNumber,
      notes: notes || null,
      isActive,
    };
    const result =
      mode === "create"
        ? createDriverSchema.safeParse({ code, ...payload })
        : updateDriverSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) { const key = String(issue.path[0]); errs[key] = issue.message; }
      setValidationErrors(errs);
      return false;
    }
    setValidationErrors({});
    return true;
  }

  function getDiff(): UpdateDriverBody {
    if (!entity) return {};
    const diff: UpdateDriverBody = {};
    if (name !== entity.name) diff.name = name;
    const newRfc = rfc || null;
    if (newRfc !== entity.rfc) diff.rfc = newRfc;
    if (licenseNumber !== entity.licenseNumber) diff.licenseNumber = licenseNumber;
    const newNotes = notes || null;
    if (newNotes !== entity.notes) diff.notes = newNotes;
    if (isActive !== entity.isActive) diff.isActive = isActive;
    return diff;
  }

  const isCreateMode = mode === "create";
  const isDirty = isCreateMode
    ? code !== "" || name !== "" || rfc !== "" || licenseNumber !== "" || notes !== "" || !isActive
    : entity !== null && Object.keys(getDiff()).length > 0;

  const isDiffEmpty = mode === "edit" && Object.keys(getDiff()).length === 0;

  function handleSave() {
    if (!validate()) return;
    if (isCreateMode) {
      onSave({ code, name, rfc: rfc || null, licenseNumber, notes: notes || null, isActive });
    } else {
      const diff = getDiff();
      if (Object.keys(diff).length === 0) return;
      onSave(diff);
    }
  }

  const title = isCreateMode ? "Nuevo operador" : "Editar operador";

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg bg-surface-container p-0 shadow-lg w-full max-w-lg backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
        <h2 className="text-title-md font-semibold text-on-surface">{title}</h2>
        <Button type="button" variant="text" size="sm" onClick={onClose} className="!px-1.5">
          <Icon name="close" size={20} />
        </Button>
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="driver-code">Código</label>
          <input
            id="driver-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={!isCreateMode}
            placeholder="EJ. OP_001"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-surface-container"
          />
          {(validationErrors.code || codeError) && (
            <p className="text-label-sm text-error mt-1">{validationErrors.code ?? codeError}</p>
          )}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="driver-name">Nombre</label>
          <input
            id="driver-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del operador"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.name && <p className="text-label-sm text-error mt-1">{validationErrors.name}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="driver-rfc">RFC</label>
          <input
            id="driver-rfc"
            type="text"
            value={rfc}
            onChange={(e) => setRfc(e.target.value.toUpperCase())}
            placeholder="Opcional"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.rfc && <p className="text-label-sm text-error mt-1">{validationErrors.rfc}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="driver-license">
            Número de licencia
          </label>
          <input
            id="driver-license"
            type="text"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="LIC-99887"
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.licenseNumber && <p className="text-label-sm text-error mt-1">{validationErrors.licenseNumber}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="driver-notes">Notas</label>
          <textarea
            id="driver-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas opcionales"
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onChange={setIsActive} aria-label="Activo" id="driver-isActive" />
          <label htmlFor="driver-isActive" className="text-label-lg text-on-surface-variant cursor-pointer">Activo</label>
        </div>

        {mutationError && (
          <p className="text-body-md text-error bg-error-container px-4 py-2 rounded">{mutationError}</p>
        )}
      </div>

      <div className="flex justify-end gap-3 px-6 py-4 border-t border-outline-variant bg-surface-container-lowest">
        <Button type="button" variant="outlined" onClick={onClose} disabled={isSaving}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant="filled"
          onClick={handleSave}
          loading={isSaving}
          disabled={!isDirty || isDiffEmpty || Object.keys(validationErrors).length > 0}
        >
          Guardar
        </Button>
      </div>
    </dialog>
  );
}
