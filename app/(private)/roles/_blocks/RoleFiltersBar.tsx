import { SearchInput } from "../../../_components/molecules/SearchInput/SearchInput";

interface RoleFiltersBarProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function RoleFiltersBar({ value, onChange, placeholder = "Buscar permisos..." }: RoleFiltersBarProps) {
  return (
    <div className="mb-4">
      <SearchInput value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
