import { computeInvoiceTotalsClient } from "./computeInvoiceTotalsClient";
import type { InvoicePreviewData } from "../types/preview";

interface BuildInvoicePreviewLineInput {
  description: string;
  productCode: string;
  satProductCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
}

interface BuildInvoicePreviewInput {
  issuer: {
    name: string | null;
    branchName?: string | null;
    rfc?: string | null;
    fiscalRegime?: string | null;
    zipCode?: string | null;
    address?: string | null;
  };
  receiver: { rfc: string; name: string; cfdiUse: string; fiscalRegime: string; taxZipCode: string };
  lines: BuildInvoicePreviewLineInput[];
  paymentForm: string;
  paymentMethod: string;
  currency?: string;
}

export function buildInvoicePreview(input: BuildInvoicePreviewInput): InvoicePreviewData {
  const totals = computeInvoiceTotalsClient(
    input.lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      ivaRate: l.ivaRate,
      iepsRate: l.iepsRate,
    }))
  );

  const lines = input.lines.map((l, idx) => ({
    description: l.description,
    productCode: l.productCode,
    satProductCode: l.satProductCode ?? null,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct,
    ivaRate: l.ivaRate,
    iepsRate: l.iepsRate,
    lineSubtotal: totals.lines[idx]?.lineSubtotal ?? 0,
    lineTotal: totals.lines[idx]?.lineTotal ?? 0,
  }));

  return {
    issuer: input.issuer,
    receiver: input.receiver,
    lines,
    paymentForm: input.paymentForm,
    paymentMethod: input.paymentMethod,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    total: totals.total,
    currency: input.currency ?? "MXN",
  };
}
