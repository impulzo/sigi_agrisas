export class InvoiceNotFoundError extends Error {
  constructor(id: string) {
    super(`Invoice not found: ${id}`);
    this.name = "InvoiceNotFoundError";
  }
}

export class SaleNotInvoiceableError extends Error {
  constructor(saleId: string, status: string) {
    super(`Sale ${saleId} cannot be invoiced (status: ${status})`);
    this.name = "SaleNotInvoiceableError";
  }
}

export class SaleAlreadyInvoicedError extends Error {
  readonly invoiceId: string;
  constructor(saleId: string, invoiceId: string) {
    super(`Sale ${saleId} already has a stamped invoice: ${invoiceId}`);
    this.name = "SaleAlreadyInvoicedError";
    this.invoiceId = invoiceId;
  }
}

export class ReceiverFiscalDataIncompleteError extends Error {
  readonly missingFields: string[];
  constructor(missingFields: string[]) {
    super(`Receiver fiscal data incomplete: ${missingFields.join(", ")}`);
    this.name = "ReceiverFiscalDataIncompleteError";
    this.missingFields = missingFields;
  }
}

export class InvoiceAlreadyCancelledError extends Error {
  constructor(invoiceId: string) {
    super(`Invoice ${invoiceId} is already cancelled`);
    this.name = "InvoiceAlreadyCancelledError";
  }
}

export class FacturamaStampError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Facturama stamp error: ${detail}`);
    this.name = "FacturamaStampError";
    this.detail = detail;
  }
}

export class FacturamaCancelError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Facturama cancel error: ${detail}`);
    this.name = "FacturamaCancelError";
    this.detail = detail;
  }
}

export class FacturamaCsdError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Facturama CSD error: ${detail}`);
    this.name = "FacturamaCsdError";
    this.detail = detail;
  }
}

export class BranchScopeViolationError extends Error {
  constructor() {
    super("Branch scope violation");
    this.name = "BranchScopeViolationError";
  }
}
