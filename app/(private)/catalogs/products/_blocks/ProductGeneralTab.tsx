"use client";

import { useState, useCallback } from "react";
import { Switch } from "../../../../_components/atoms/Switch/Switch";
import { updateProduct } from "../_logic/services/products";
import { ProductDepartmentInvalidError } from "../_logic/errors";
import { createProductSchema } from "../_logic/schemas/product.schema";
import type { Product } from "../_logic/types/domain";
import type { UpdateProductBody } from "../_logic/types/api";

interface DeptOption { id: string; name: string; }

interface ProductGeneralTabProps {
  product: Product;
  canWrite: boolean;
  deptOptions: DeptOption[];
  onUpdated: (updated: Product) => void;
}

function taxRateToDisplay(rate: number | null): string {
  if (rate === null) return "";
  return String(Math.round(rate * 100));
}

function parseTaxInput(val: string): number | null {
  const t = val.trim();
  if (!t) return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

export function ProductGeneralTab({ product, canWrite, deptOptions, onUpdated }: ProductGeneralTabProps) {
  const [name, setName] = useState(product.name);
  const [unit, setUnit] = useState(product.unit);
  const [departmentId, setDepartmentId] = useState(product.departmentId);
  const [satProductCode, setSatProductCode] = useState(product.satProductCode ?? "");
  const [ivaRate, setIvaRate] = useState(taxRateToDisplay(product.ivaRate));
  const [iepsRate, setIepsRate] = useState(taxRateToDisplay(product.iepsRate));
  const [isActive, setIsActive] = useState(product.isActive);
  const [isSaving, setIsSaving] = useState(false);
  const [deptError, setDeptError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const buildDiff = useCallback((): UpdateProductBody => {
    const diff: UpdateProductBody = {};
    if (name !== product.name) diff.name = name;
    if (unit !== product.unit) diff.unit = unit;
    if (departmentId !== product.departmentId) diff.departmentId = departmentId;
    const parsedSat = satProductCode.trim() === "" ? null : satProductCode.trim();
    if (parsedSat !== product.satProductCode) diff.satProductCode = parsedSat;
    const parsedIva = parseTaxInput(ivaRate);
    if (parsedIva !== product.ivaRate) diff.ivaRate = parsedIva;
    const parsedIeps = parseTaxInput(iepsRate);
    if (parsedIeps !== product.iepsRate) diff.iepsRate = parsedIeps;
    if (isActive !== product.isActive) diff.isActive = isActive;
    return diff;
  }, [product, name, unit, departmentId, satProductCode, ivaRate, iepsRate, isActive]);

  const isDiffEmpty = Object.keys(buildDiff()).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError(null);
    setSaveError(null);
    setValidationErrors({});
    const diff = buildDiff();
    if (Object.keys(diff).length === 0) return;
    setIsSaving(true);
    try {
      const updated = await updateProduct({ id: product.id, body: diff });
      onUpdated(updated);
    } catch (err) {
      if (err instanceof ProductDepartmentInvalidError) {
        setDeptError("El departamento no existe o está inactivo.");
      } else {
        setSaveError((err as Error).message ?? "Error al guardar.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-4">
      {saveError && (
        <p className="text-label-sm text-error bg-error-container/30 px-3 py-2 rounded-xl">{saveError}</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1">Código</label>
          <input type="text" value={product.code} disabled className={fieldClass} />
        </div>
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1">Unidad *</label>
          <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} disabled={!canWrite} maxLength={30} className={fieldClass} />
          {validationErrors.unit && <p className="text-label-sm text-error mt-1">{validationErrors.unit}</p>}
        </div>
      </div>

      <div>
        <label className="block text-label-lg text-on-surface-variant mb-1">Nombre *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} disabled={!canWrite} maxLength={120} className={fieldClass} />
        {validationErrors.name && <p className="text-label-sm text-error mt-1">{validationErrors.name}</p>}
      </div>

      <div>
        <label className="block text-label-lg text-on-surface-variant mb-1">Departamento *</label>
        <select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} disabled={!canWrite} className={fieldClass}>
          <option value="">Selecciona un departamento</option>
          {deptOptions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {deptError && <p className="text-label-sm text-error mt-1">{deptError}</p>}
      </div>

      <div>
        <label className="block text-label-lg text-on-surface-variant mb-1">Cód. SAT (8 dígitos)</label>
        <input type="text" value={satProductCode} onChange={(e) => setSatProductCode(e.target.value.replace(/\D/g, "").slice(0, 8))} disabled={!canWrite} className={fieldClass} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1">IVA (%)</label>
          <div className="relative">
            <input type="number" value={ivaRate} onChange={(e) => setIvaRate(e.target.value)} disabled={!canWrite} min={0} max={100} placeholder="Ej. 16" className={`${fieldClass} pr-8`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface-variant">%</span>
          </div>
        </div>
        <div>
          <label className="block text-label-lg text-on-surface-variant mb-1">IEPS (%)</label>
          <div className="relative">
            <input type="number" value={iepsRate} onChange={(e) => setIepsRate(e.target.value)} disabled={!canWrite} min={0} max={100} placeholder="Ej. 8" className={`${fieldClass} pr-8`} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-label-sm text-on-surface-variant">%</span>
          </div>
        </div>
      </div>

      {canWrite && (
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <Switch checked={isActive} onChange={setIsActive} aria-label="Activo" />
          <span className="text-label-lg text-on-surface-variant">Activo</span>
        </label>
      )}

      {canWrite && (
        <button
          type="submit"
          disabled={isSaving || isDiffEmpty}
          className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </button>
      )}
    </form>
  );
}
