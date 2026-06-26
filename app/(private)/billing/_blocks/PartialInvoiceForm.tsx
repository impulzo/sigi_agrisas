"use client";

import { useState } from "react";
import { CustomerPicker } from "../../pos/_blocks/CustomerPicker";
import { CustomerQuickAddModal } from "../../pos/_blocks/CustomerQuickAddModal";
import { ProductCatalogPanel } from "../../pos/_blocks/ProductCatalogPanel";
import { PartialInvoiceLineRow } from "./PartialInvoiceLineRow";
import { usePartialInvoiceForm } from "../_logic/hooks/usePartialInvoiceForm";
import { ReceiverFiscalDataIncompleteError, FacturamaStampError } from "../_logic/errors";
import type { CustomerDto } from "../../pos/_logic/types/api";
import type { ProductDto } from "../../pos/_logic/types/api";

const MX = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 });

const PAYMENT_FORMS = [
  { value: "03", label: "03 - Transferencia" },
  { value: "01", label: "01 - Efectivo" },
  { value: "04", label: "04 - Tarjeta crédito" },
  { value: "28", label: "28 - Tarjeta débito" },
  { value: "99", label: "99 - Por definir" },
];

const PAYMENT_METHODS = [
  { value: "PUE", label: "PUE - Pago en una exhibición" },
  { value: "PPD", label: "PPD - Parcialidades o diferido" },
];

export function PartialInvoiceForm() {
  const {
    customer, setCustomer, fiscalMissingFields,
    lines, addLine, updateLine, removeLine,
    paymentForm, setPaymentForm, paymentMethod, setPaymentMethod,
    totals, isSubmitting, error, clearError, submit,
  } = usePartialInvoiceForm();

  const [customerId, setCustomerId] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  function handleCustomerSelect(id: string, dto: CustomerDto | null) {
    setCustomerId(id);
    if (!dto || !id) { setCustomer(null); return; }
    setCustomer({
      rfc: dto.rfc,
      name: dto.name,
      cfdiUse: dto.cfdiUse ?? "",
      fiscalRegime: dto.taxRegime ?? "",
      taxZipCode: dto.taxZipCode ?? "",
    });
  }

  function handleAddProduct(product: ProductDto) {
    addLine({
      productId: product.id,
      productCode: product.code,
      description: product.name,
      satProductCode: "",
      satUnitCode: "",
      unit: "H87",
      quantity: 1,
      unitPrice: 0,
      discountPct: 0,
      ivaRate: product.ivaRate ?? 0.16,
      iepsRate: product.iepsRate ?? 0,
    });
    setShowCatalog(false);
  }

  function handleAddFreeLine() {
    addLine({
      productId: null,
      productCode: `LIB-${Date.now()}`,
      description: "",
      satProductCode: "",
      satUnitCode: "",
      unit: "H87",
      quantity: 1,
      unitPrice: 0,
      discountPct: 0,
      ivaRate: 0.16,
      iepsRate: 0,
    });
  }

  function renderError() {
    if (!error) return null;
    const msg = error instanceof ReceiverFiscalDataIncompleteError
      ? `Datos fiscales incompletos: ${error.missingFields.join(", ")}`
      : error instanceof FacturamaStampError
      ? `Error Facturama: ${error.detail}`
      : error.message;
    return (
      <div className="rounded-lg bg-error-container/30 border border-error/30 px-4 py-3 text-body-sm text-error flex items-start justify-between gap-2">
        <span>{msg}</span>
        <button type="button" onClick={clearError} className="flex-shrink-0 hover:opacity-70">×</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Nota importante */}
      <div className="rounded-xl bg-tertiary-container/30 border border-tertiary/30 px-4 py-3 flex items-start gap-2">
        <span className="text-tertiary text-lg flex-shrink-0">ℹ</span>
        <p className="text-body-sm text-on-surface-variant">
          <strong>La factura parcial no afecta inventario.</strong> Esta modalidad genera un CFDI fiscal independiente sin vincular a ninguna venta del sistema.
        </p>
      </div>

      {/* Cliente */}
      <div>
        <label className="block text-label-md text-on-surface mb-1">
          Receptor <span className="text-error">*</span>
        </label>
        <CustomerPicker
          value={customerId}
          onChange={handleCustomerSelect}
          onOpenQuickAdd={() => setShowQuickAdd(true)}
        />
        {fiscalMissingFields.length > 0 && customer && (
          <div className="mt-2 rounded-lg bg-warning-container/30 border border-warning/30 px-3 py-2 text-label-sm text-on-surface-variant">
            Datos fiscales faltantes:{" "}
            <strong>{fiscalMissingFields.join(", ")}</strong>. Edita el cliente en el catálogo.
          </div>
        )}
        {customer && fiscalMissingFields.length === 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-label-sm text-on-surface-variant">
            <span>RFC: <strong className="font-mono text-on-surface">{customer.rfc}</strong></span>
            <span>CFDI: <strong className="text-on-surface">{customer.cfdiUse}</strong></span>
            <span>Régimen: <strong className="text-on-surface">{customer.fiscalRegime}</strong></span>
            <span>CP: <strong className="text-on-surface">{customer.taxZipCode}</strong></span>
          </div>
        )}
      </div>

      {/* Líneas */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-label-md font-semibold text-on-surface">Conceptos <span className="text-error">*</span></h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCatalog((v) => !v)}
              className="rounded-full border border-outline px-3 py-1 text-label-sm hover:bg-surface-container transition-colors"
            >
              + Catálogo
            </button>
            <button
              type="button"
              onClick={handleAddFreeLine}
              className="rounded-full border border-outline px-3 py-1 text-label-sm hover:bg-surface-container transition-colors"
            >
              + Línea libre
            </button>
          </div>
        </div>

        {showCatalog && (
          <div className="border border-outline-variant rounded-xl overflow-hidden mb-4">
            <ProductCatalogPanel onAddProduct={handleAddProduct} />
          </div>
        )}

        {lines.length > 0 ? (
          <div className="overflow-x-auto border border-outline-variant rounded-xl">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="border-b border-outline-variant text-label-sm text-on-surface-variant uppercase tracking-wide">
                  <th className="px-2 py-2 text-left font-medium">Descripción</th>
                  <th className="px-2 py-2 text-right font-medium w-20">Cant.</th>
                  <th className="px-2 py-2 text-right font-medium w-28">Precio</th>
                  <th className="px-2 py-2 text-right font-medium w-20">Desc.%</th>
                  <th className="px-2 py-2 text-right font-medium w-20">IVA%</th>
                  <th className="px-2 py-2 text-right font-medium w-20">IEPS%</th>
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <PartialInvoiceLineRow
                    key={line._key}
                    line={line}
                    lineTotal={totals.lines[idx]?.lineTotal ?? 0}
                    onUpdate={(patch) => updateLine(line._key, patch)}
                    onRemove={() => removeLine(line._key)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant py-4 text-center border border-outline-variant border-dashed rounded-xl">
            Sin conceptos. Agrega del catálogo o como línea libre.
          </p>
        )}
      </div>

      {/* Pago */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="partial-payment-form" className="block text-label-md text-on-surface mb-1">Forma de pago</label>
          <select
            id="partial-payment-form"
            value={paymentForm}
            onChange={(e) => setPaymentForm(e.target.value)}
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {PAYMENT_FORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="partial-payment-method" className="block text-label-md text-on-surface mb-1">Método de pago</label>
          <select
            id="partial-payment-method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-lg border border-outline px-3 py-2 text-body-sm bg-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {PAYMENT_METHODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {renderError()}

      {/* Totales + submit */}
      <div className="border-t border-outline-variant pt-4 flex flex-col sm:flex-row items-end justify-between gap-4">
        <div className="space-y-1 text-body-sm">
          <div className="flex justify-between gap-8">
            <span className="text-on-surface-variant">Subtotal</span>
            <span className="tabular-nums">{MX.format(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-on-surface-variant">Impuestos</span>
            <span className="tabular-nums">{MX.format(totals.taxTotal)}</span>
          </div>
          <div className="flex justify-between gap-8 font-semibold text-title-sm">
            <span>Total</span>
            <span className="tabular-nums">{MX.format(totals.total)}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => submit()}
          disabled={isSubmitting || lines.length === 0 || !customer || fiscalMissingFields.length > 0}
          className="rounded-full bg-secondary text-on-secondary px-6 py-2.5 text-label-lg font-medium hover:bg-secondary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Timbrando…" : "Emitir factura parcial"}
        </button>
      </div>

      {showQuickAdd && (
        <CustomerQuickAddModal
          onClose={() => setShowQuickAdd(false)}
          onCreated={(dto) => {
            setCustomerId(dto.id);
            setCustomer({
              rfc: dto.rfc,
              name: dto.name,
              cfdiUse: dto.cfdiUse ?? "",
              fiscalRegime: dto.taxRegime ?? "",
              taxZipCode: dto.taxZipCode ?? "",
            });
            setShowQuickAdd(false);
          }}
        />
      )}
    </div>
  );
}
