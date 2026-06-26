"use client";

import { useRef, useEffect, useState } from "react";
import { useFoliosOptions } from "../../../_hooks/useFoliosOptions";
import { usePaymentMethodsOptions } from "../../../_hooks/usePaymentMethodsOptions";
import { registerPayment } from "../_logic/services/registerPayment";
import { PaymentExceedsDueAmountError, SaleNotPayableError, FolioScopeMismatchError } from "../_logic/errors";
import { Spinner } from "../../../_components/atoms/Spinner/Spinner";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });
function fmt(n: number) { return MX.format(n); }

interface RegisterPaymentModalProps {
  saleId: string;
  dueAmount: number;
  onSuccess: () => void;
  onClose: () => void;
}

export function RegisterPaymentModal({ saleId, dueAmount, onSuccess, onClose }: RegisterPaymentModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { options: folioOptions, isLoading: foliosLoading } = useFoliosOptions({ scope: "OPERATIONS" });
  const { options: methodOptions, isLoading: methodsLoading } = usePaymentMethodsOptions();

  const [amount, setAmount] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [folioId, setFolioId] = useState("");
  const [notes, setNotes] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.showModal();
    }
    const dialog = dialogRef.current;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog?.addEventListener("cancel", handleCancel);
    return () => {
      dialog?.removeEventListener("cancel", handleCancel);
      dialog?.close();
    };
  }, [onClose]);

  useEffect(() => {
    if (!foliosLoading && folioOptions.length > 0 && !folioId) {
      const rb = folioOptions.find((f) => f.code === "RB");
      setFolioId(rb?.id ?? folioOptions[0].id);
    }
  }, [foliosLoading, folioOptions, folioId]);

  useEffect(() => {
    if (!methodsLoading && methodOptions.length > 0 && !paymentMethodId) {
      setPaymentMethodId(methodOptions[0].id);
    }
  }, [methodsLoading, methodOptions, paymentMethodId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAmountError(null);
    setFormError(null);

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setAmountError("El monto debe ser mayor a 0");
      return;
    }
    if (!paymentMethodId) {
      setFormError("Selecciona un método de pago");
      return;
    }
    if (!folioId) {
      setFormError("Selecciona un folio");
      return;
    }

    setIsSaving(true);
    try {
      await registerPayment({ saleId, amount: numAmount, paymentMethodId, folioId, notes: notes || undefined });
      onSuccess();
    } catch (err) {
      if (err instanceof PaymentExceedsDueAmountError) {
        setAmountError(err.message);
      } else if (err instanceof SaleNotPayableError) {
        setFormError(err.message);
      } else if (err instanceof FolioScopeMismatchError) {
        setFormError(err.message);
      } else if (err instanceof Error) {
        setFormError(err.message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl bg-surface shadow-elevation-3 p-0 w-full max-w-md backdrop:bg-black/40"
      onClose={onClose}
    >
      <div className="px-6 py-4 border-b border-outline-variant">
        <h2 className="text-title-md font-semibold text-on-surface">Registrar abono</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
        {/* Amount */}
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
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setAmountError(null); }}
            className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
            placeholder="0.00"
          />
          {amountError && <p className="text-body-sm text-error">{amountError}</p>}
        </div>

        {/* Payment method */}
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant" htmlFor="reg-method">
            Método de pago
          </label>
          <select
            id="reg-method"
            value={paymentMethodId}
            onChange={(e) => setPaymentMethodId(e.target.value)}
            className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
            disabled={methodsLoading}
          >
            {methodOptions.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Folio */}
        <div className="flex flex-col gap-1">
          <label className="text-label-md text-on-surface-variant" htmlFor="reg-folio">
            Folio de recibo
          </label>
          <select
            id="reg-folio"
            value={folioId}
            onChange={(e) => setFolioId(e.target.value)}
            className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary"
            disabled={foliosLoading}
          >
            {folioOptions.map((f) => (
              <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
            ))}
          </select>
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
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-xl border border-outline bg-surface px-3 py-2 text-body-md text-on-surface focus:outline-none focus:border-primary resize-none"
            placeholder="Comentarios adicionales..."
          />
        </div>

        {formError && (
          <p className="text-body-sm text-error bg-error-container/20 rounded-lg px-3 py-2">{formError}</p>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-full border border-outline px-5 py-2 text-body-sm font-medium text-on-surface hover:bg-surface-container-low transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-primary text-on-primary px-5 py-2 text-body-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
          >
            {isSaving && <Spinner size="sm" />}
            Registrar abono
          </button>
        </div>
      </form>
    </dialog>
  );
}
