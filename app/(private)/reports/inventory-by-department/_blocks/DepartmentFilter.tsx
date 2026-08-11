"use client";

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

const inputCls =
  "rounded-xl border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 min-w-56";

export function DepartmentFilter({
  departmentId,
  onDepartmentIdChange,
  departments,
  isLoading,
}: Props) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-sm text-on-surface-variant">Departamento</span>
      <select
        value={departmentId}
        onChange={(e) => onDepartmentIdChange(e.target.value)}
        className={inputCls}
        disabled={isLoading}
      >
        <option value="">Selecciona un departamento…</option>
        {departments.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
    </label>
  );
}
