"use client";

import { useState, useEffect } from "react";
import { usePricingSettingsMutations } from "../_logic/hooks/usePricingSettingsMutations";
import type { PricingSettingsDto } from "../_logic/types/api";

interface PricingSettingsFormProps {
  settings: PricingSettingsDto;
  canWrite: boolean;
  onChange: (updated: PricingSettingsDto) => void;
}

export function PricingSettingsForm({ settings, canWrite, onChange }: PricingSettingsFormProps) {
  const [dosificationSurchargePct, setDosificationSurchargePct] = useState(String(settings.dosificationSurchargePct));

  const { isSaving, mutationError, clearError, update } = usePricingSettingsMutations(onChange);

  useEffect(() => {
    setDosificationSurchargePct(String(settings.dosificationSurchargePct));
  }, [settings]);

  const parsedValue = Number(dosificationSurchargePct);
  const isValid = dosificationSurchargePct.trim() !== "" && Number.isFinite(parsedValue) && parsedValue >= 0;

  async function handleSave() {
    if (!isValid) return;
    await update({ dosificationSurchargePct: parsedValue });
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <label htmlFor="dosification-surcharge-pct" className="block text-label-md text-on-surface mb-1">
          Recargo de dosificaciones (%)
        </label>
        <input
          id="dosification-surcharge-pct"
          type="number"
          min={0}
          step="0.01"
          value={dosificationSurchargePct}
          onChange={(e) => setDosificationSurchargePct(e.target.value)}
          disabled={!canWrite}
          className="w-full max-w-[160px] rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Porcentaje que se suma al precio base calculado de cada dosificación en catálogo y punto de venta. Default: 5%.
        </p>
        {!isValid && dosificationSurchargePct.trim() !== "" && (
          <p className="mt-1 text-label-sm text-error">El porcentaje debe ser un número mayor o igual a 0.</p>
        )}
      </div>

      {mutationError && (
        <div className="rounded-lg bg-error-container/30 px-3 py-2 text-body-sm text-error flex items-center justify-between gap-2">
          {mutationError.message}
          <button type="button" onClick={clearError} className="text-error hover:underline flex-shrink-0">Cerrar</button>
        </div>
      )}

      {canWrite && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isValid}
          className="px-4 py-2 rounded-lg text-label-lg bg-primary text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </button>
      )}
    </div>
  );
}
