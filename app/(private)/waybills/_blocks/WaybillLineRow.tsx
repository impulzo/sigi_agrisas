"use client";

import { cn } from "../../../_lib/cn";
import type { WaybillLineState } from "../_logic/hooks/useCreateWaybillForm";
import type { WaybillType } from "../_logic/types/api";

interface WaybillLineRowProps {
  type: WaybillType;
  line: WaybillLineState;
  onUpdate: (patch: Partial<WaybillLineState>) => void;
  onRemove: () => void;
}

function NumField({
  value,
  onChange,
  min = 0,
  step = "any",
  placeholder = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: string;
  placeholder?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      step={step}
      placeholder={placeholder}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-sm border border-outline px-2 py-1 text-body-sm bg-surface focus:outline-none focus:border-primary tabular-nums"
    />
  );
}

export function WaybillLineRow({ type, line, onUpdate, onRemove }: WaybillLineRowProps) {
  const isSimple = type === "simple";

  return (
    <tr className={cn("border-b border-outline-variant/40 align-top", line.error && "bg-error-container/20")}>
      <td className="px-2 py-2">
        <div className="space-y-1">
          <input
            type="text"
            value={line.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Descripción *"
            disabled={isSimple}
            className="w-full rounded-sm border border-outline px-2 py-1 text-body-sm bg-surface focus:outline-none focus:border-primary disabled:bg-surface-container-low disabled:text-on-surface-variant"
          />
          {line.error && <p className="text-label-sm text-error">{line.error}</p>}
        </div>
      </td>
      {!isSimple && (
        <td className="px-2 py-2 w-32">
          <input
            type="text"
            value={line.satBienesTranspCode}
            onChange={(e) => onUpdate({ satBienesTranspCode: e.target.value })}
            placeholder="Clave SAT"
            className="w-full rounded-sm border border-outline px-2 py-1 text-body-sm bg-surface focus:outline-none focus:border-primary font-mono"
          />
        </td>
      )}
      {!isSimple && (
        <td className="px-2 py-2 w-24">
          <input
            type="text"
            value={line.satUnitCode}
            onChange={(e) => onUpdate({ satUnitCode: e.target.value })}
            placeholder="Unidad"
            className="w-full rounded-sm border border-outline px-2 py-1 text-body-sm bg-surface focus:outline-none focus:border-primary font-mono"
          />
        </td>
      )}
      <td className="px-2 py-2 w-20">
        <NumField value={line.quantity} onChange={(v) => onUpdate({ quantity: v })} min={0.001} step="0.001" placeholder="1" />
      </td>
      {!isSimple && (
        <td className="px-2 py-2 w-24">
          <NumField value={line.weightKg} onChange={(v) => onUpdate({ weightKg: v })} min={0.001} step="0.001" placeholder="0" />
        </td>
      )}
      {!isSimple && (
        <td className="px-2 py-2 w-24">
          <label className="flex items-center gap-1 text-label-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={line.isHazardousMaterial}
              onChange={(e) => onUpdate({ isHazardousMaterial: e.target.checked })}
            />
            Peligroso
          </label>
          {line.isHazardousMaterial && (
            <input
              type="text"
              value={line.hazardousMaterialCode}
              onChange={(e) => onUpdate({ hazardousMaterialCode: e.target.value })}
              placeholder="Clave material"
              className="w-full mt-1 rounded-sm border border-outline px-2 py-1 text-body-sm bg-surface focus:outline-none focus:border-primary font-mono"
            />
          )}
        </td>
      )}
      <td className="px-2 py-2">
        <button
          type="button"
          onClick={onRemove}
          title="Quitar línea"
          className="text-error hover:text-error/70 text-label-sm transition-colors"
        >
          ×
        </button>
      </td>
    </tr>
  );
}
