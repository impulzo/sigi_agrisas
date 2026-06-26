"use client";

import Link from "next/link";
import { SalePickerField } from "./SalePickerField";
import { useStampSaleForm } from "../_logic/hooks/useStampSaleForm";
import { SaleAlreadyInvoicedError, ReceiverFiscalDataIncompleteError, FacturamaStampError } from "../_logic/errors";

const PAYMENT_FORMS = [
  { value: "01", label: "01 - Efectivo" },
  { value: "03", label: "03 - Transferencia" },
  { value: "04", label: "04 - Tarjeta de crédito" },
  { value: "28", label: "28 - Tarjeta de débito" },
  { value: "99", label: "99 - Por definir" },
];

const PAYMENT_METHODS = [
  { value: "PUE", label: "PUE - Pago en una exhibición" },
  { value: "PPD", label: "PPD - Pago en parcialidades o diferido" },
];

const CFDI_USES = [
  { value: "G01", label: "G01 - Adquisición de mercancias" },
  { value: "G03", label: "G03 - Gastos en general" },
  { value: "P01", label: "P01 - Por definir" },
  { value: "S01", label: "S01 - Sin efectos fiscales" },
  { value: "CP01", label: "CP01 - Pagos" },
];

interface StampSaleFormProps {
  initialSaleId?: string;
  initialSaleLabel?: string;
}

export function StampSaleForm({ initialSaleId, initialSaleLabel }: StampSaleFormProps) {
  const { form, setField, isSubmitting, error, clearError, submit } = useStampSaleForm(initialSaleId, initialSaleLabel);

  function renderError() {
    if (!error) return null;
    if (error instanceof SaleAlreadyInvoicedError) {
      return (
        <div className="rounded-lg bg-warning-container/30 border border-warning/30 px-4 py-3 text-body-sm">
          Esta venta ya tiene una factura vigente.{" "}
          <Link href={`/billing/${error.invoiceId}`} className="text-primary underline">
            Ver factura existente
          </Link>
          <button type="button" onClick={clearError} className="ml-3 text-on-surface-variant hover:text-on-surface">×</button>
        </div>
      );
    }
    if (error instanceof ReceiverFiscalDataIncompleteError) {
      return (
        <div className="rounded-lg bg-error-container/30 border border-error/30 px-4 py-3 text-body-sm text-error">
          Datos fiscales del receptor incompletos: <strong>{error.missingFields.join(", ")}</strong>
          <button type="button" onClick={clearError} className="ml-3 hover:opacity-70">×</button>
        </div>
      );
    }
    if (error instanceof FacturamaStampError) {
      return (
        <div className="rounded-lg bg-error-container/30 border border-error/30 px-4 py-3 text-body-sm text-error">
          Error Facturama: {error.detail}
          <button type="button" onClick={clearError} className="ml-3 hover:opacity-70">×</button>
        </div>
      );
    }
    return (
      <div className="rounded-lg bg-error-container/30 border border-error/30 px-4 py-3 text-body-sm text-error">
        {error.message}
        <button type="button" onClick={clearError} className="ml-3 hover:opacity-70">×</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <label className="block text-label-md text-on-surface mb-1">
          Venta a facturar <span className="text-error">*</span>
        </label>
        <SalePickerField
          value={form.saleId}
          label={form.saleLabel}
          onSelect={(id, label) => { setField("saleId", id); setField("saleLabel", label); }}
        />
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Busca por folio o nombre del cliente. Solo ventas completadas sin CFDI vigente.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="stamp-payment-form" className="block text-label-md text-on-surface mb-1">Forma de pago</label>
          <select
            id="stamp-payment-form"
            value={form.paymentForm}
            onChange={(e) => setField("paymentForm", e.target.value)}
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {PAYMENT_FORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="stamp-payment-method" className="block text-label-md text-on-surface mb-1">Método de pago</label>
          <select
            id="stamp-payment-method"
            value={form.paymentMethod}
            onChange={(e) => setField("paymentMethod", e.target.value)}
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="stamp-cfdi-use" className="block text-label-md text-on-surface mb-1">Uso CFDI</label>
          <select
            id="stamp-cfdi-use"
            value={form.cfdiUse}
            onChange={(e) => setField("cfdiUse", e.target.value)}
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {CFDI_USES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {renderError()}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => submit()}
          disabled={isSubmitting || !form.saleId}
          className="rounded-full bg-primary text-on-primary px-6 py-2.5 text-label-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Timbrando…" : "Emitir factura"}
        </button>
      </div>
    </div>
  );
}
