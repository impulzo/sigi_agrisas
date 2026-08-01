"use client";

import { SegmentedButton } from "../../../_components/molecules/SegmentedButton/SegmentedButton";
import type { WaybillType } from "../_logic/types/api";

interface WaybillTypeToggleProps {
  value: WaybillType;
  onChange: (value: WaybillType) => void;
  canStamp: boolean;
}

export function WaybillTypeToggle({ value, onChange, canStamp }: WaybillTypeToggleProps) {
  const options = [
    { value: "simple" as const, label: "Traspaso simple" },
    ...(canStamp ? [{ value: "carta_porte" as const, label: "Con Carta Porte" }] : []),
  ];

  return (
    <div>
      <SegmentedButton value={value} options={options} onChange={onChange} aria-label="Tipo de traspaso" />
      {!canStamp && (
        <p className="mt-2 text-body-sm text-on-surface-variant">
          No tienes permiso para timbrar Carta Porte. Solo puedes crear traspasos simples.
        </p>
      )}
    </div>
  );
}
