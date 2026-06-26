export const INVOICE_STATUSES = ["stamped", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export function isValidInvoiceStatus(value: string): value is InvoiceStatus {
  return INVOICE_STATUSES.includes(value as InvoiceStatus);
}
