"use client";

import type { Invoice } from "../_logic/types/domain";

const MOTIVE_LABELS: Record<string, string> = {
  "01": "01 - Comprobante emitido con errores con relación",
  "02": "02 - Comprobante emitido con errores sin relación",
  "03": "03 - No se llevó a cabo la operación",
  "04": "04 - Operación nominativa relacionada en factura global",
};

interface InvoiceMetaPanelProps {
  invoice: Invoice;
}

export function InvoiceMetaPanel({ invoice: inv }: InvoiceMetaPanelProps) {
  const fmtDate = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("es-MX", { dateStyle: "long", timeStyle: "short" }).format(d) : "—";

  return (
    <div className="space-y-4">
      {inv.status === "cancelled" && (
        <div className="rounded-xl bg-error-container/30 border border-error/30 px-4 py-3">
          <p className="text-label-sm font-semibold text-error mb-1">Factura cancelada</p>
          <p className="text-body-sm text-on-surface-variant">
            Motivo: {inv.cancellationMotive ? (MOTIVE_LABELS[inv.cancellationMotive] ?? inv.cancellationMotive) : "—"}
          </p>
          <p className="text-body-sm text-on-surface-variant">
            Fecha: {fmtDate(inv.cancelledAt)}
          </p>
        </div>
      )}

      <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-4">
        <h2 className="text-title-sm font-semibold text-on-surface mb-3">Datos del receptor</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-label-sm text-on-surface-variant">RFC</dt>
            <dd className="text-body-sm text-on-surface font-mono">{inv.receiverRfc}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Nombre</dt>
            <dd className="text-body-sm text-on-surface">{inv.receiverName}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Uso CFDI</dt>
            <dd className="text-body-sm text-on-surface">{inv.receiverCfdiUse}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Régimen fiscal</dt>
            <dd className="text-body-sm text-on-surface">{inv.receiverFiscalRegime}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">CP fiscal</dt>
            <dd className="text-body-sm text-on-surface">{inv.receiverTaxZipCode}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-4">
        <h2 className="text-title-sm font-semibold text-on-surface mb-3">Datos de pago CFDI</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-label-sm text-on-surface-variant">Forma de pago</dt>
            <dd className="text-body-sm text-on-surface">{inv.paymentForm}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Método de pago</dt>
            <dd className="text-body-sm text-on-surface">{inv.paymentMethod}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Uso CFDI</dt>
            <dd className="text-body-sm text-on-surface">{inv.cfdiUse}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-on-surface-variant">Moneda</dt>
            <dd className="text-body-sm text-on-surface">{inv.currency}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
