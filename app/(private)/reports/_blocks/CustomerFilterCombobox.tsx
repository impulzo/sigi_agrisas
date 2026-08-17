"use client";

import { useState } from "react";
import { Combobox } from "../../../_components/molecules/Combobox/Combobox";
import { useDebounce } from "../../../_hooks/useDebounce";
import { useCustomerSearch } from "../../payments/_logic/hooks/useCustomerSearch";

interface Props {
  value: string;
  onChange: (customerId: string) => void;
}

/** Combobox de filtro por cliente, reutiliza `useCustomerSearch` (módulo payments) sin quick-add. */
export function CustomerFilterCombobox({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);
  const { items, isLoading } = useCustomerSearch({ search: debounced });

  const options = query === ""
    ? [{ value: "", label: "Todos los clientes" }, ...items.map((c) => ({ value: c.id, label: `${c.name} · ${c.code}` }))]
    : items.map((c) => ({ value: c.id, label: `${c.name} · ${c.code}` }));

  return (
    <div>
      <label className="text-label-sm text-on-surface-variant mb-1 block">Cliente</label>
      <Combobox
        value={value}
        onChange={onChange}
        onSearch={setQuery}
        options={options}
        isLoading={isLoading}
        placeholder="Buscar cliente…"
      />
    </div>
  );
}
