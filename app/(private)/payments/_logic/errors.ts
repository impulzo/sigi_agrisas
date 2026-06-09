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
