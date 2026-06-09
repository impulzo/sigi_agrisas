"use client";

import { useState, useEffect, useRef } from "react";
import { useDebounce } from "../../../_hooks/useDebounce";
import { authFetch } from "../../../_lib/authFetch";

interface ProductOption {
  id: string;
  code: string;
  name: string;
}

interface InventoryAssignModalProps {
  open: boolean;
  branchId: string;
  isSaving: boolean;
  assignError: string | null;
  onAssign: (productId: string, quantity: number, reorderPoint: number) => void;
  onClose: () => void;
}

export function InventoryAssignModal({ open, branchId, isSaving, assignError, onAssign, onClose }: InventoryAssignModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [reorderPoint, setReorderPoint] = useState("0");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) dialog.showModal(); else dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const h = (e: Event) => { e.preventDefault(); onClose(); };
    dialog.addEventListener("cancel", h);
    return () => dialog.removeEventListener("cancel", h);
  }, [onClose]);

  useEffect(() => {
    if (!open) { setSearch(""); setSelectedProductId(""); setQuantity("0"); setReorderPoint("0"); setErrors({}); }
  }, [open]);

  useEffect(() => {
    if (!debouncedSearch.trim() || debouncedSearch.trim().length < 2) { setProductOptions([]); return; }
    authFetch(`/api/v1/admin/products?pageSize=20&search=${encodeURIComponent(debouncedSearch.trim())}`)
      .then((res) => res.json())
      .then((body: { items: { id: string; code: string; name: string }[] }) => {
        setProductOptions(body.items.map((p) => ({ id: p.id, code: p.code, name: p.name })));
      })
      .catch(() => setProductOptions([]));
  }, [debouncedSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!selectedProductId) errs.productId = "Selecciona un producto.";
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 0) errs.quantity = "La cantidad no puede ser negativa.";
    const rp = parseInt(reorderPoint);
    if (isNaN(rp) || rp < 0) errs.reorderPoint = "El punto de reorden no puede ser negativo.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onAssign(selectedProductId, qty, rp);
  };

  const fieldClass = "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <dialog ref={dialogRef} className="rounded-2xl shadow-xl bg-surface p-0 w-full max-w-md backdrop:bg-black/40">
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant">
          <h2 className="text-title-md font-semibold text-on-surface">Asignar producto</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {assignError && <p className="text-label-sm text-error bg-error-container/30 px-3 py-2 rounded-xl">{assignError}</p>}

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Buscar producto *</label>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setSelectedProductId(""); }} placeholder="Escribe el nombre o código (mín. 2 caracteres)" className={fieldClass} />
            {productOptions.length > 0 && !selectedProductId && (
              <ul className="mt-1 border border-outline-variant rounded-xl bg-surface shadow-lg max-h-40 overflow-y-auto">
                {productOptions.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setSelectedProductId(p.id); setSearch(`${p.code} - ${p.name}`); setProductOptions([]); }} className="w-full text-left px-3 py-2 hover:bg-surface-container-low text-body-md">
                      <span className="font-mono text-label-lg">{p.code}</span> — {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {errors.productId && <p className="text-label-sm text-error mt-1">{errors.productId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1">Stock inicial</label>
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min={0} step={1} className={fieldClass} />
              {errors.quantity && <p className="text-label-sm text-error mt-1">{errors.quantity}</p>}
            </div>
            <div>
              <label className="block text-label-lg text-on-surface-variant mb-1">Punto de reorden</label>
              <input type="number" value={reorderPoint} onChange={(e) => setReorderPoint(e.target.value)} min={0} step={1} className={fieldClass} />
              {errors.reorderPoint && <p className="text-label-sm text-error mt-1">{errors.reorderPoint}</p>}
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 pt-2 flex justify-end gap-3 border-t border-outline-variant">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 rounded-xl text-label-lg text-on-surface-variant hover:bg-surface-container transition-colors">Cancelar</button>
          <button type="submit" disabled={isSaving} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 disabled:opacity-50">{isSaving ? "Asignando…" : "Asignar"}</button>
        </div>
      </form>
    </dialog>
  );
}
