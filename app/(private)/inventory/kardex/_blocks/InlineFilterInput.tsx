import { Icon } from "../../../../_components/atoms/Icon/Icon";

interface InlineFilterInputProps {
  value: string;
  onChange: (v: string) => void;
}

export function InlineFilterInput({ value, onChange }: InlineFilterInputProps) {
  return (
    <div className="relative max-w-xs">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
        <Icon name="search" size={16} />
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filtrar filas cargadas..."
        className="w-full pl-9 pr-3 py-1.5 rounded-md border border-outline-variant bg-surface-container-lowest text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
