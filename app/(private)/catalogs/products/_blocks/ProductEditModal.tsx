"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Switch } from "../../../../_components/atoms/Switch/Switch";
import { createProductSchema, updateProductSchema } from "../_logic/schemas/product.schema";
import type { Product } from "../_logic/types/domain";
import type { CreateProductBody, UpdateProductBody } from "../_logic/types/api";

interface DeptOption {
  id: string;
  name: string;
}

interface ProductEditModalProps {
  open: boolean;
  mode: "create" | "edit";
  entity: Product | null;
  isSaving: boolean;
  codeError: string | null;
  deptError: string | null;
  mutationError: string | null;
  deptOptions: DeptOption[];
  onSave: (data: CreateProductBody | UpdateProductBody) => void;
  onClose: () => void;
}

function taxRateToDisplay(rate: number | null): string {
  if (rate === null) return "";
  return String(Math.round(rate * 100));
}

function parseTaxInput(val: string): number | null {
  const trimmed = val.trim();
  if (trimmed === "") return null;
  const n = parseFloat(trimmed);
  if (isNaN(n)) return null;
  return n;
}

export function ProductEditModal({
  open,
  mode,
  entity,
  isSaving,
  codeError,
  deptError,
  mutationError,
  deptOptions,
  onSave,
  onClose,
}: ProductEditModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [satProductCode, setSatProductCode] = useState("");
  const [ivaRate, setIvaRate] = useState("");
  const [iepsRate, setIepsRate] = useState("");
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
    const handler = (e: Event) => { e.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", handler);
    return () => dialog.removeEventListener("cancel", handler);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    if (mode === "create") {
      setCode(""); setName(""); setUnit(""); setDepartmentId("");
      setSatProductCode(""); setIvaRate(""); setIepsRate(""); setIsActive(true);
    } else if (entity) {
      setCode(entity.code);
      setName(entity.name);
      setUnit(entity.unit);
      setDepartmentId(entity.departmentId);
      setSatProductCode(entity.satProductCode ?? "");
      setIvaRate(taxRateToDisplay(entity.ivaRate));
      setIepsRate(taxRateToDisplay(entity.iepsRate));
      setIsActive(entity.isActive);
    }
    setValidationErrors({});
  }, [open, mode, entity]);

  const buildDiff = useCallback((): UpdateProductBody => {
    if (!entity) return {};
    const diff: UpdateProductBody = {};
    if (name !== entity.name) diff.name = name;
    if (unit !== entity.unit) diff.unit = unit;
    if (departmentId !== entity.departmentId) diff.departmentId = departmentId;
    const parsedSat = satProductCode.trim() === "" ? null : satProductCode.trim();
    if (parsedSat !== entity.satProductCode) diff.satProductCode = parsedSat;
    const parsedIva = parseTaxInput(ivaRate);
    if (parsedIva !== entity.ivaRate) diff.ivaRate = parsedIva;
    const parsedIeps = parseTaxInput(iepsRate);
    if (parsedIeps !== entity.iepsRate) diff.iepsRate = parsedIeps;
    if (isActive !== entity.isActive) diff.isActive = isActive;
    return diff;
  }, [entity, name, unit, departmentId, satProductCode, ivaRate, iepsRate, isActive]);

  const isDiffEmpty = mode === "edit" && Object.keys(buildDiff()).length === 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationErrors({});

    const formData = {
      code: code.trim(),
      name: name.trim(),
      unit: unit.trim(),
      departmentId: departmentId,
      satProductCode: satProductCode.trim() || null,
      ivaRate: parseTaxInput(ivaRate),
      iepsRate: parseTaxInput(iepsRate),
      isActive,
    };

    if (mode === "create") {
      const result = createProductSchema.safeParse(formData);
      if (!result.success) {
        const errs: Record<string, string> = {};
        result.error.errors.forEach((e) => { if (e.path[0]) errs[String(e.path[0])] = e.message; });
        setValidationErrors(errs);
        return;
      }
      onSave(result.data as CreateProductBody);
    } else {
      const diff = buildDiff();
      if (Object.keys(diff).length === 0) return;
      onSave(diff);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl shadow-xl bg-surface p-0 w-full max-w-lg backdrop:bg-black/40"
    >
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant">
          <h2 className="text-title-md font-semibold text-on-surface">
            {mode === "create" ? "Nuevo producto" : "Editar producto"}
          </h2>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {mutationError && (
            <p className="text-label-sm text-error bg-error-container/30 px-3 py-2 rounded-xl">{mutationError}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1">Código *</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={mode === "edit"}
                maxLength={32}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              {(codeError || validationErrors.code) && (
                <p className="text-label-sm text-error mt-1">{codeError ?? validationErrors.code}</p>
              )}
            </div>

            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1">Unidad *</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={30}
                className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {validationErrors.unit && (
                <p className="text-label-sm text-error mt-1">{validationErrors.unit}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {validationErrors.name && (
              <p className="text-label-sm text-error mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Departamento *</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Selecciona un departamento</option>
              {deptOptions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            {(deptError || validationErrors.departmentId) && (
              <p className="text-label-sm text-error mt-1">{deptError ?? validationErrors.departmentId}</p>
            )}
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Cód. SAT (8 dígitos)</label>
            <input
              type="text"
              value={satProductCode}
              onChange={(e) => setSatProductCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
              placeholder="Ej. 01010101"
              className="w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {validationErrors.satProductCode && (
              <p className="text-label-sm text-error mt-1">{validationErrors.satProductCode}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1">IVA (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={ivaRate}
                  onChange={(e) => setIvaRate(e.target.value)}
                  min={0}
                  max={100}
                  placeholder="Ej. 16"
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface-variant">%</span>
              </div>
              {validationErrors.ivaRate && (
                <p className="text-label-sm text-error mt-1">{validationErrors.ivaRate}</p>
              )}
            </div>

            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1">IEPS (%)</label>
              <div className="relative">
                <input
                  type="number"
                  value={iepsRate}
                  onChange={(e) => setIepsRate(e.target.value)}
                  min={0}
                  max={100}
                  placeholder="Ej. 8"
                  className="w-full pl-3 pr-8 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface-variant">%</span>
              </div>
              {validationErrors.iepsRate && (
                <p className="text-label-sm text-error mt-1">{validationErrors.iepsRate}</p>
              )}
            </div>
          </div>

          {mode === "edit" && (
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <Switch checked={isActive} onChange={setIsActive} aria-label="Activo" />
              <span className="text-label-lg text-on-surface-variant">Activo</span>
            </label>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 flex justify-end gap-3 border-t border-outline-variant">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-label-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving || isDiffEmpty}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? "Guardando…" : mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
