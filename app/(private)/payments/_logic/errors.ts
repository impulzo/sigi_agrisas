export class PaymentExceedsDueAmountError extends Error {
  readonly due: string;
  constructor(due: string) {
    super(`El monto supera el saldo pendiente ($${due})`);
    this.name = "PaymentExceedsDueAmountError";
    this.due = due;
  }
}

export class SaleNotPayableError extends Error {
  constructor(opts?: { message?: string }) {
    super(opts?.message ?? "Esta venta no admite abonos");
    this.name = "SaleNotPayableError";
  }
}

export class PaymentAlreadyCancelledError extends Error {
  constructor() {
    super("Este abono ya fue cancelado");
    this.name = "PaymentAlreadyCancelledError";
  }
}

export class FolioScopeMismatchError extends Error {
  constructor(public readonly expected: string, public readonly actual: string) {
    super(`El folio seleccionado es de tipo ${actual}, pero este flujo requiere uno de tipo ${expected}.`);
    this.name = "FolioScopeMismatchError";
  }
}
