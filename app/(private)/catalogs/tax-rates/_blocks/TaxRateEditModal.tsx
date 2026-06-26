"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "../../../../_components/atoms/Icon/Icon";
import { Switch } from "../../../../_components/atoms/Switch/Switch";
import { createTaxRateSchema, updateTaxRateSchema } from "../_logic/schemas/taxRate.schema";
import type { TaxRate } from "../_logic/types/domain";
import type { CreateTaxRateBody, UpdateTaxRateBody } from "../_logic/types/api";

interface TaxRateEditModalProps {
  open: boolean;
  mode: "create" | "edit";
  entity: TaxRate | null;
  isSaving: boolean;
  codeError: string | null;
  mutationError: string | null;
  onSave: (data: CreateTaxRateBody | UpdateTaxRateBody) => void;
  onClose: () => void;
}

export function TaxRateEditModal({
  open,
  mode,
  entity,
  isSaving,
  codeError,
  mutationError,
  onSave,
  onClose,
}: TaxRateEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rateStr, setRateStr] = useState("");
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
      setCode(""); setName(""); setDescription(""); setRateStr(""); setIsActive(true);
    } else if (entity) {
      setCode(entity.code);
      setName(entity.name);
      setDescription(entity.description ?? "");
      setRateStr(String((entity.rate * 100).toFixed(4).replace(/\.?0+$/, "")));
      setIsActive(entity.isActive);
    }
    setValidationErrors({});
  }, [open, mode, entity]);

  const rateNum = parseFloat(rateStr);

  function validate(): boolean {
    const schema = mode === "create" ? createTaxRateSchema : updateTaxRateSchema;
    const data = mode === "create"
      ? { code, name, description: description || null, rate: isNaN(rateNum) ? undefined : rateNum, isActive }
      : { name, description: description || null, rate: isNaN(rateNum) ? undefined : rateNum, isActive };
    const result = schema.safeParse(data);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) errs[String(issue.path[0])] = issue.message;
      setValidationErrors(errs);
      return false;
    }
    setValidationErrors({});
    return true;
  }

  function getDiff(): UpdateTaxRateBody {
    if (!entity) return {};
    const diff: UpdateTaxRateBody = {};
    if (name !== entity.name) diff.name = name;
    const desc = description || null;
    if (desc !== entity.description) diff.description = desc;
    const newRate = isNaN(rateNum) ? null : rateNum / 100;
    if (newRate !== null && newRate !== entity.rate) diff.rate = rateNum;
    if (isActive !== entity.isActive) diff.isActive = isActive;
    return diff;
  }

  const isDirty =
    mode === "create"
      ? code !== "" || name !== "" || description !== "" || rateStr !== "" || !isActive
      : entity !== null && (
          name !== entity.name ||
          (description || null) !== entity.description ||
          (!isNaN(rateNum) && rateNum / 100 !== entity.rate) ||
          isActive !== entity.isActive
        );

  const isDiffEmpty = mode === "edit" && Object.keys(getDiff()).length === 0;

  function handleSave() {
    if (!validate()) return;
    if (mode === "create") {
      onSave({ code, name, description: description || null, rate: rateNum / 100, isActive });
    } else {
      const diff = getDiff();
      if (Object.keys(diff).length === 0) return;
      onSave(diff);
    }
  }

  const title = mode === "create" ? "Nueva Tasa de Impuesto" : "Editar Tasa de Impuesto";

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl bg-surface-container p-0 shadow-lg w-full max-w-lg backdrop:bg-black/40"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
        <h2 className="text-title-md font-semibold text-on-surface">{title}</h2>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5 max-h-[65vh] overflow-y-auto">
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="tr-code">Código</label>
          <input
            id="tr-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={mode !== "create"}
            placeholder="EJ. IVA_16"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-surface-container"
          />
          {(validationErrors.code || codeError) && (
            <p className="text-label-sm text-error mt-1">{validationErrors.code ?? codeError}</p>
          )}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="tr-name">Nombre</label>
          <input
            id="tr-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la tasa"
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {validationErrors.name && <p className="text-label-sm text-error mt-1">{validationErrors.name}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="tr-rate">Tasa (%)</label>
          <div className="relative">
            <input
              id="tr-rate"
              type="number"
              value={rateStr}
              onChange={(e) => setRateStr(e.target.value)}
              placeholder="16"
              step="0.01"
              min="0"
              max="100"
              className="w-full px-3 py-2 pr-8 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-body-md">%</span>
          </div>
          {validationErrors.rate && <p className="text-label-sm text-error mt-1">{validationErrors.rate}</p>}
        </div>

        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1" htmlFor="tr-description">Descripción</label>
          <textarea
            id="tr-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional"
            rows={3}
            className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          {validationErrors.description && <p className="text-label-sm text-error mt-1">{validationErrors.description}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={isActive} onChange={setIsActive} aria-label="Activo" id="tr-isActive" />
          <label htmlFor="tr-isActive" className="text-label-lg text-on-surface-variant cursor-pointer">Activo</label>
        </div>

        {mutationError && (
          <p className="text-body-md text-error bg-error-container px-4 py-2 rounded-lg">{mutationError}</p>
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
            <><Icon name="progress_activity" size={16} className="animate-spin" />Guardando...</>
          ) : "Guardar"}
        </button>
      </div>
    </dialog>
  );
}
