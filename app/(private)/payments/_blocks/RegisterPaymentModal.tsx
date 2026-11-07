"use client";

import { useRef, useEffect } from "react";
import { useRegisterPaymentForm } from "../_logic/hooks/useRegisterPaymentForm";
import { formatMxCurrency } from "../../../_lib/formatMxCurrency";
import { Button } from "../../../_components/atoms/Button/Button";
import { Select } from "../../../_components/atoms/Select/Select";
import type { LineBalance } from "../_logic/types/domain";

function fmt(n: number) { return formatMxCurrency(n); }

interface RegisterPaymentModalProps {
  saleId: string;
  dueAmount: number;
  lineBalances: LineBalance[];
  onSuccess: () => void;
  onClose: () => void;
}

export function RegisterPaymentModal({ saleId, dueAmount, lineBalances, onSuccess, onClose }: RegisterPaymentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const form = useRegisterPaymentForm({ saleId, lineBalances, onSuccess });

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-lg bg-surface shadow-elevation-3 p-0 w-full max-w-md backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="px-6 py-4 border-b border-outline-variant">
        <h2 className="text-title-md font-semibold text-on-surface">Registrar abono</h2>
      </div>

      <form onSubmit={form.handleSubmit} className="flex flex-col gap-4 p-6">
        {lineBalances.length > 0 && (
          <label className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <input
              type="checkbox"
              checked={form.byLine}
              onChange={(e) => form.setByLine(e.target.checked)}
              className="rounded-sm border-outline"
            />
            Repartir por producto
          </label>
        )}

        {!form.byLine ? (
          <div className="flex flex-col gap-1">
            <label className="text-label-md text-on-surface-variant" htmlFor="reg-amount">
              Monto
            </label>
            <p className="text-body-sm text-on-surface-variant">
              Saldo pendiente: <span className="font-medium text-on-surface">{fmt(dueAmount)}</span>
            </p>
            <input
              id="reg-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={form.amount}
              onChange={(e) => form.setAmount(e.target.value)}
              className="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
              placeholder="0.00"
            />
            {form.amountError && <p className="text-body-sm text-error">{form.amountError}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-label-md text-on-surface-variant">Monto por producto</p>
            {lineBalances.map((lb) => {
              const disabled = lb.dueAmount <= 0;
              const err = form.lineErrors[lb.saleItemId];
              return (
                <div key={lb.saleItemId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-body-sm text-on-surface truncate">{lb.productNameSnapshot}</span>
                    <span className="text-label-sm text-on-surface-variant shrink-0">
                      Pendiente: {fmt(lb.dueAmount)}
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={lb.dueAmount > 0 ? lb.dueAmount : undefined}
                    disabled={disabled}
                    value={form.lineAmounts[lb.saleItemId] ?? ""}
                    onChange={(e) => form.setLineAmount(lb.saleItemId, e.target.value)}
                    placeholder="0.00"
                    className="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary disabled:opacity-50 disabled:bg-surface-container-low"
                  />
                  {err && <p className="text-body-sm text-error">{err}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Payment method */}
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant" htmlFor="reg-method">
            Método de pago
          </label>
          <Select id="reg-method" value={form.paymentMethodId} onChange={(e) => form.setPaymentMethodId(e.target.value)} disabled={form.methodsLoading}>
            {form.methodOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </Select>
        </div>

        {/* Folio */}
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant" htmlFor="reg-folio">
            Folio de recibo
          </label>
          <Select id="reg-folio" value={form.folioId} onChange={(e) => form.setFolioId(e.target.value)} disabled={form.foliosLoading}>
            {form.folioOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
            ))}
          </Select>
        </div>

        {/* Notes */}
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant" htmlFor="reg-notes">
            Notas <span className="text-on-surface-variant/60">(opcional)</span>
          </label>
          <textarea
            id="reg-notes"
            rows={2}
            maxLength={1000}
            value={form.notes}
            onChange={(e) => form.setNotes(e.target.value)}
            className="rounded-md border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
            placeholder="Comentarios adicionales..."
          />
        </div>

        {form.formError && (
          <p className="text-body-sm text-error bg-error-container/20 rounded px-3 py-2">{form.formError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outlined"
            onClick={() => dialogRef.current?.close()}
            className="px-5 py-2 text-body-sm"
          >
            Cancelar
          </Button>
          <Button type="submit" variant="filled" loading={form.isSaving} className="px-5 py-2 text-body-sm">
            Registrar abono
          </Button>
        </div>
      </form>
    </dialog>
  );
}
