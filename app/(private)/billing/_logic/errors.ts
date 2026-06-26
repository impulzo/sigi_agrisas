export class InvoiceNotFoundError extends Error {
  constructor() { super("Factura no encontrada"); this.name = "InvoiceNotFoundError"; }
}

export class SaleAlreadyInvoicedError extends Error {
  readonly invoiceId: string;
  constructor(invoiceId: string) {
    super("Esta venta ya tiene una factura vigente");
    this.name = "SaleAlreadyInvoicedError";
    this.invoiceId = invoiceId;
  }
}

export class SaleNotInvoiceableError extends Error {
  constructor() { super("Esta venta no puede ser facturada"); this.name = "SaleNotInvoiceableError"; }
}

export class ReceiverFiscalDataIncompleteError extends Error {
  readonly missingFields: string[];
  constructor(missingFields: string[]) {
    super(`Datos fiscales del receptor incompletos: ${missingFields.join(", ")}`);
    this.name = "ReceiverFiscalDataIncompleteError";
    this.missingFields = missingFields;
  }
}

export class FacturamaStampError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Error de timbrado Facturama: ${detail}`);
    this.name = "FacturamaStampError";
    this.detail = detail;
  }
}

export class InvoiceAlreadyCancelledError extends Error {
  constructor() { super("La factura ya está cancelada"); this.name = "InvoiceAlreadyCancelledError"; }
}

export class FacturamaCancelError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Error al cancelar en Facturama: ${detail}`);
    this.name = "FacturamaCancelError";
    this.detail = detail;
  }
}

export class FacturamaCsdError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Error de CSD en Facturama: ${detail}`);
    this.name = "FacturamaCsdError";
    this.detail = detail;
  }
}

export class BillingForbiddenError extends Error {
  constructor() { super("No tienes permiso para esta operación de facturación"); this.name = "BillingForbiddenError"; }
}
