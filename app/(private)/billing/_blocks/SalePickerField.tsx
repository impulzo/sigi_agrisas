"use client";

import { useState, useRef, useEffect } from "react";
import { authFetch } from "../../../_lib/authFetch";
import { useDebounce } from "../../../_hooks/useDebounce";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

interface SaleOption {
  id: string;
  folioLabel: string;
  customerName: string | null;
  total: number;
}

interface SalePickerFieldProps {
  value: string;
  label: string;
  onSelect: (id: string, label: string) => void;
}

async function searchSales(search: string): Promise<SaleOption[]> {
  if (search.length < 2) return [];
  const params = new URLSearchParams({ search, status: "completed", pageSize: "20" });
  const res = await authFetch(`/api/v1/admin/sales?${params.toString()}`);
  if (!res.ok) return [];
  const body = await res.json() as { items: Array<{ id: string; folioPrefix?: string | null; folioNumber: number; customerName?: string | null; total: number }> };
  return body.items.map((s) => ({
    id: s.id,
    folioLabel: s.folioPrefix ? `${s.folioPrefix}-${s.folioNumber}` : String(s.folioNumber),
    customerName: s.customerName ?? null,
    total: s.total,
  }));
}

export function SalePickerField({ value, label, onSelect }: SalePickerFieldProps) {
  const [query, setQuery] = useState(label);
  const [results, setResults] = useState<SaleOption[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); setOpen(false); return; }
    setIsLoading(true);
    searchSales(debouncedQuery).then((items) => {
      setResults(items);
      setOpen(items.length > 0);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  function handleSelect(opt: SaleOption) {
    const lbl = `${opt.folioLabel} · ${opt.customerName ?? "Sin cliente"} · ${MX.format(opt.total)}`;
    setQuery(lbl);
    setOpen(false);
    onSelect(opt.id, lbl);
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        placeholder="Buscar venta por folio o cliente (mín. 2 caracteres)..."
        onChange={(e) => { setQuery(e.target.value); if (value) onSelect("", ""); }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />
      {isLoading && (
        <span className="absolute right-3 top-2.5 text-label-sm text-on-surface-variant">Buscando…</span>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-surface border border-outline rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {results.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleSelect(opt)}
              className="w-full px-4 py-3 text-left hover:bg-surface-container-low transition-colors border-b border-outline-variant/40 last:border-0"
            >
              <p className="text-body-sm font-medium text-on-surface font-mono">{opt.folioLabel}</p>
              <p className="text-label-sm text-on-surface-variant">{opt.customerName ?? "Sin cliente"} · {MX.format(opt.total)}</p>
            </button>
          ))}
        </div>
      )}
      {!open && query.length >= 2 && !isLoading && !value && (
        <p className="mt-1 text-label-sm text-on-surface-variant">Sin resultados para &quot;{query}&quot;</p>
      )}
    </div>
  );
}
