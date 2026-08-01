"use client";

import { SegmentedButton } from "../../../_components/molecules/SegmentedButton/SegmentedButton";

export type PeriodMode = "full" | "range";

interface Props {
  mode: PeriodMode;
  onModeChange: (m: PeriodMode) => void;
  from: string;
  onFromChange: (v: string) => void;
  to: string;
  onToChange: (v: string) => void;
}

const inputCls =
  "rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40";

export function PeriodSelector({ mode, onModeChange, from, onFromChange, to, onToChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <SegmentedButton<PeriodMode>
        value={mode}
        onChange={onModeChange}
        aria-label="Periodo"
        options={[
          { value: "full", label: "Completo" },
          { value: "range", label: "Rango" },
        ]}
      />

      {mode === "range" && (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-label-sm text-on-surface-variant">Desde</span>
            <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-sm text-on-surface-variant">Hasta</span>
            <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className={inputCls} />
          </label>
        </>
      )}
    </div>
  );
}
