"use client";

import { useState } from "react";
import { Combobox } from "../../../../_components/molecules/Combobox/Combobox";
import { useDebounce } from "../../../../_hooks/useDebounce";
import { useProviderSearch } from "../../../purchases/_logic/hooks/useProviderSearch";

interface Props {
  value: string;
  onChange: (providerId: string) => void;
}

/** Combobox de filtro por proveedor, reutiliza `useProviderSearch` (módulo purchases) sin quick-add. */
export function ProviderFilterCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const { items, isLoading } = useProviderSearch({ search: debounced });

  const options = items.map((p) => ({ value: p.id, label: `${p.name} · ${p.rfc}` }));

  return (
    <div>
      <label className="text-label-sm text-on-surface-variant mb-1 block">Proveedor</label>
      <Combobox
        value={value}
        onChange={onChange}
        onSearch={setQuery}
        options={options}
        isLoading={isLoading}
        placeholder="Buscar proveedor…"
      />
    </div>
  );
}
