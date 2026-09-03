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

export {
  FacturamaStampError,
  FacturamaCancelError,
  BranchScopeViolationError,
} from "@/shared/domain/errors/facturama";

export class FacturamaCsdError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Facturama CSD error: ${detail}`);
    this.name = "FacturamaCsdError";
    this.detail = detail;
  }
}

export class InvoiceNoEmailError extends Error {
  constructor() {
    super("Customer has no email and no override provided");
    this.name = "InvoiceNoEmailError";
  }
}

export class InvoiceNotStampedError extends Error {
  constructor() {
    super("Invoice has not been stamped");
    this.name = "InvoiceNotStampedError";
  }
}

export class InvoiceEmailSendFailedError extends Error {
  constructor(cause: unknown) {
    super("Failed to send invoice email");
    this.name = "InvoiceEmailSendFailedError";
    this.cause = cause;
  }
}

export class InvoiceFileDownloadFailedError extends Error {
  constructor(cause: unknown) {
    super("Failed to download invoice file");
    this.name = "InvoiceFileDownloadFailedError";
    this.cause = cause;
  }
}
