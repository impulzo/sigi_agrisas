export class PaymentExceedsDueAmountError extends Error {
  readonly due: string;
  constructor(due: string) {
    super(`El monto supera el saldo pendiente ($${due})`);
    this.name = "PaymentExceedsDueAmountError";
    this.due = due;
  }
}

export class PaymentExceedsLineDueAmountError extends Error {
  readonly saleItemId: string;
  readonly due: string;
  constructor(saleItemId: string, due: string) {
    super(`Supera el saldo pendiente de esta línea ($${due})`);
    this.name = "PaymentExceedsLineDueAmountError";
    this.saleItemId = saleItemId;
    this.due = due;
  }
}

export class PaymentItemsAmountMismatchError extends Error {
  constructor() {
    super("La suma de los montos por línea no coincide con el monto total");
    this.name = "PaymentItemsAmountMismatchError";
  }
}

export class SaleItemNotFoundError extends Error {
  readonly saleItemId: string;
  constructor(saleItemId: string) {
    super("La línea seleccionada no pertenece a esta venta");
    this.name = "SaleItemNotFoundError";
    this.saleItemId = saleItemId;
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
