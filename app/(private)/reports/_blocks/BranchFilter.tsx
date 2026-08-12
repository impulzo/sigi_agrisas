"use client";

import { Select } from "../../../_components/atoms/Select";

interface Option {
  id: string;
  name: string;
}

interface Props {
  branchId: string;
  onBranchIdChange: (v: string) => void;
  branches: Option[];
}

export function BranchFilter({ branchId, onBranchIdChange, branches }: Props) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-sm text-on-surface-variant">Sucursal</span>
      <Select
        value={branchId}
        onChange={(e) => onBranchIdChange(e.target.value)}
        className="min-w-56"
      >
        <option value="">Todas</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
