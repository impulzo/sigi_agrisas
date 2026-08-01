"use client";

import { Switch } from "../../../_components/atoms/Switch/Switch";
import { SegmentedButton } from "../../../_components/molecules/SegmentedButton/SegmentedButton";
import type { LedgerSort } from "../_logic/types/domain";

interface Props {
  history: boolean;
  onHistoryChange: (v: boolean) => void;
  sort: LedgerSort;
  onSortChange: (v: LedgerSort) => void;
}

export function LedgerControls({ history, onHistoryChange, sort, onSortChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <label className="flex items-center gap-2">
        <Switch checked={history} onChange={onHistoryChange} aria-label="Mostrar histórico" />
        <span className="text-body-sm text-on-surface-variant">Mostrar Histórico</span>
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-label-sm text-on-surface-variant">Orden de Información</span>
        <SegmentedButton<LedgerSort>
          value={sort}
          onChange={onSortChange}
          aria-label="Orden de información"
          options={[
            { value: "date", label: "Fecha" },
            { value: "invoice", label: "Factura" },
            { value: "serie", label: "Serie" },
          ]}
        />
      </div>
    </div>
  );
}
