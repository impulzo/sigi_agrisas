"use client";

import { Select } from "../../../../_components/atoms/Select";

interface Option {
  id: string;
  name: string;
}

interface Props {
  departmentId: string;
  onDepartmentIdChange: (v: string) => void;
  departments: Option[];
  isLoading: boolean;
}

export function DepartmentFilter({
  departmentId,
  onDepartmentIdChange,
  departments,
  isLoading,
}: Props) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-sm text-on-surface-variant">Departamento</span>
      <Select
        value={departmentId}
        onChange={(e) => onDepartmentIdChange(e.target.value)}
        disabled={isLoading}
        className="min-w-56"
      >
        <option value="">Selecciona un departamento…</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
