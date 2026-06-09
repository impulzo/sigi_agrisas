"use client";

import { useState, useEffect, useRef } from "react";
import type { InventoryItem } from "../_logic/types/domain";

interface StockAdjustModalProps {
  open: boolean;
  item: InventoryItem;
  isSaving: boolean;
  adjustError: string | null;
  onAdjust: (delta: number, reason?: string) => void;
  onClose: () => void;
}

export function StockAdjustModal({ open, item, isSaving, adjustError, onAdjust, onClose }: StockAdjustModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
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
    if (!open) { setDelta(""); setReason(""); setErrors({}); }
  }, [open]);

  const parsedDelta = parseFloat(delta);
  const isValidDelta = !isNaN(parsedDelta) && parsedDelta !== 0;
  const resultingStock = !isNaN(parsedDelta) ? item.quantity + parsedDelta : item.quantity;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!isValidDelta) errs.delta = "El delta no puede ser cero ni vacío.";
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onAdjust(parsedDelta, reason.trim() || undefined);
  };

  const fieldClass = "w-full px-3 py-2 rounded-xl border border-outline-variant bg-surface-container-lowest text-body-md focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <dialog ref={dialogRef} className="rounded-2xl shadow-xl bg-surface p-0 w-full max-w-sm backdrop:bg-black/40">
      <form onSubmit={handleSubmit} noValidate>
        <div className="px-6 pt-6 pb-4 border-b border-outline-variant">
          <h2 className="text-title-md font-semibold text-on-surface">Ajustar stock</h2>
          <p className="text-body-md text-on-surface-variant mt-0.5">{item.productCode} — {item.productName}</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          {adjustError && <p className="text-label-sm text-error bg-error-container/30 px-3 py-2 rounded-xl">{adjustError}</p>}

          <div className="flex items-center justify-between bg-surface-container-high rounded-xl px-4 py-3">
            <span className="text-label-lg text-on-surface-variant">Stock actual</span>
            <span className="text-title-md font-semibold text-on-surface">{item.quantity}</span>
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Delta (+ agregar / − restar) *</label>
            <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} step={1} placeholder="Ej. 25 o -10" className={fieldClass} />
            {errors.delta && <p className="text-label-sm text-error mt-1">{errors.delta}</p>}
          </div>

          <div className="flex items-center justify-between bg-surface-container-high rounded-xl px-4 py-3">
            <span className="text-label-lg text-on-surface-variant">Stock resultante</span>
            <span className={`text-title-md font-semibold ${resultingStock < 0 ? "text-error" : "text-on-surface"}`}>{Math.floor(resultingStock)}</span>
          </div>

          <div>
            <label className="block text-label-lg text-on-surface-variant mb-1">Motivo (opcional)</label>
            <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="Ej. Recepción de compra" className={fieldClass} />
          </div>
        </div>
        <div className="px-6 pb-6 pt-2 flex justify-end gap-3 border-t border-outline-variant">
          <button type="button" onClick={onClose} disabled={isSaving} className="px-4 py-2 rounded-xl text-label-lg text-on-surface-variant hover:bg-surface-container transition-colors">Cancelar</button>
          <button type="submit" disabled={isSaving || !isValidDelta} className="px-4 py-2 rounded-xl bg-primary text-on-primary text-label-lg font-medium hover:opacity-90 disabled:opacity-50">{isSaving ? "Ajustando…" : "Aplicar ajuste"}</button>
        </div>
      </form>
    </dialog>
  );
}
