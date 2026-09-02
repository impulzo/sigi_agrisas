"use client";

import { useState } from "react";
import Link from "next/link";
import { SalePickerField } from "./SalePickerField";
import { InvoicePreviewModal } from "./InvoicePreviewModal";
import { CustomerPicker } from "../../pos/_blocks/CustomerPicker";
import { CustomerQuickAddModal } from "../../pos/_blocks/CustomerQuickAddModal";
import { useStampSaleForm } from "../_logic/hooks/useStampSaleForm";
import { useInvoicePreview } from "../_logic/hooks/useInvoicePreview";
import { SaleAlreadyInvoicedError, ReceiverFiscalDataIncompleteError, FacturamaStampError } from "../_logic/errors";
import { SAT_PAYMENT_FORMS, SAT_PAYMENT_METHODS } from "@/shared/domain/catalogs/satPaymentCatalogs";

const PAYMENT_FORMS = SAT_PAYMENT_FORMS.map((e) => ({ value: e.code, label: `${e.code} - ${e.description}` }));
const PAYMENT_METHODS = SAT_PAYMENT_METHODS.map((e) => ({ value: e.code, label: `${e.code} - ${e.description}` }));

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
  const { form, setField, selectSale, isSubmitting, error, clearError, submit } = useStampSaleForm(initialSaleId, initialSaleLabel);
  const [showPreview, setShowPreview] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const preview = useInvoicePreview();

  function handleOpenPreview() {
    setShowPreview(true);
    preview.load(form.saleId, { paymentForm: form.paymentForm, paymentMethod: form.paymentMethod, customerId: form.customerId || undefined });
  }

  async function handleConfirmStamp() {
    setShowPreview(false);
    await submit();
  }

  function renderError() {
    if (!error) return null;
    if (error instanceof SaleAlreadyInvoicedError) {
      return (
        <div className="rounded bg-warning-container/30 border border-warning/30 px-4 py-3 text-body-sm">
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
        <div className="rounded bg-error-container/30 border border-error/30 px-4 py-3 text-body-sm text-error">
          Datos fiscales del receptor incompletos: <strong>{error.missingFields.join(", ")}</strong>
          <button type="button" onClick={clearError} className="ml-3 hover:opacity-70">×</button>
        </div>
      );
    }
    if (error instanceof FacturamaStampError) {
      return (
        <div className="rounded bg-error-container/30 border border-error/30 px-4 py-3 text-body-sm text-error">
          Error Facturama: {error.detail}
          <button type="button" onClick={clearError} className="ml-3 hover:opacity-70">×</button>
        </div>
      );
    }
    return (
      <div className="rounded bg-error-container/30 border border-error/30 px-4 py-3 text-body-sm text-error">
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
          onSelect={selectSale}
        />
        <p className="mt-1 text-label-sm text-on-surface-variant">
          Busca por folio o nombre del cliente. Solo ventas completadas sin CFDI vigente.
        </p>
      </div>

      {form.saleId && (
        <div>
          <CustomerPicker
            value={form.customerId}
            onChange={(id) => setField("customerId", id)}
            onOpenQuickAdd={() => setShowQuickAdd(true)}
          />
          <p className="mt-1 text-label-sm text-on-surface-variant">
            Cliente que recibirá el CFDI. Por defecto es el cliente de la venta; puedes cambiarlo sin alterar el ticket original.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="stamp-payment-form" className="block text-label-md text-on-surface mb-1">Forma de pago</label>
          <select
            id="stamp-payment-form"
            value={form.paymentForm}
            onChange={(e) => setField("paymentForm", e.target.value)}
            className="w-full rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
            className="w-full rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
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
            className="w-full rounded border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {CFDI_USES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {renderError()}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleOpenPreview}
          disabled={!form.saleId || !form.customerId}
          className="rounded-full border border-outline px-6 py-2.5 text-label-lg font-medium hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Vista previa
        </button>
        <button
          type="button"
          onClick={() => submit()}
          disabled={isSubmitting || !form.saleId || !form.customerId}
          className="rounded-full bg-primary text-on-primary px-6 py-2.5 text-label-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Timbrando…" : "Emitir factura"}
        </button>
      </div>

      <InvoicePreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        data={preview.data}
        isLoading={preview.isLoading}
        loadError={preview.error}
        onConfirmStamp={handleConfirmStamp}
        isSubmitting={isSubmitting}
      />

      {showQuickAdd && (
        <CustomerQuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onCreated={(dto) => {
            setField("customerId", dto.id);
            setShowQuickAdd(false);
          }}
        />
      )}
    </div>
  );
}
