export class PurchaseNotFoundError extends Error {
  constructor() { super("Compra no encontrada"); this.name = "PurchaseNotFoundError"; }
}

export class PurchaseAlreadyCancelledError extends Error {
  constructor() { super("La compra ya está cancelada"); this.name = "PurchaseAlreadyCancelledError"; }
}

export class PurchaseItemsEmptyError extends Error {
  constructor() { super("Agrega al menos un producto a la compra"); this.name = "PurchaseItemsEmptyError"; }
}

export class ProviderNotFoundOrInactiveError extends Error {
  constructor() { super("El proveedor no existe o está inactivo"); this.name = "ProviderNotFoundOrInactiveError"; }
}

export class ProductNotFoundOrInactiveError extends Error {
  constructor() { super("Un producto de la compra no existe o está inactivo"); this.name = "ProductNotFoundOrInactiveError"; }
}

export class PurchaseHasActiveProviderPaymentsError extends Error {
  readonly providerPaymentIds: string[];
  constructor(providerPaymentIds: string[] = []) {
    super("Esta compra tiene abonos activos; cancélalos primero");
    this.name = "PurchaseHasActiveProviderPaymentsError";
    this.providerPaymentIds = providerPaymentIds;
  }
}

export class PurchaseNotPayableError extends Error {
  constructor() { super("Esta compra no es a crédito y no admite abonos"); this.name = "PurchaseNotPayableError"; }
}

export class ProviderPaymentExceedsDueAmountError extends Error {
  readonly due: number;
  constructor(due = 0) {
    super("El monto excede el saldo pendiente de la compra");
    this.name = "ProviderPaymentExceedsDueAmountError";
    this.due = due;
  }
}

export class ProviderPaymentNotFoundError extends Error {
  constructor() { super("Abono no encontrado"); this.name = "ProviderPaymentNotFoundError"; }
}

export class ProviderPaymentAlreadyCancelledError extends Error {
  constructor() { super("El abono ya está cancelado"); this.name = "ProviderPaymentAlreadyCancelledError"; }
}

export class ProviderCodeAlreadyInUseError extends Error {
  constructor() { super("Este código ya está en uso"); this.name = "ProviderCodeAlreadyInUseError"; }
}

export class ProviderRfcAlreadyInUseError extends Error {
  constructor() { super("Este RFC ya está en uso por otro proveedor"); this.name = "ProviderRfcAlreadyInUseError"; }
}

export class PurchaseReadForbiddenError extends Error {
  constructor() { super("No tienes permiso para ver compras"); this.name = "PurchaseReadForbiddenError"; }
}

export class PurchaseCreateForbiddenError extends Error {
  constructor() { super("No tienes permiso para registrar compras"); this.name = "PurchaseCreateForbiddenError"; }
}

export class PurchaseCancelForbiddenError extends Error {
  constructor() { super("No tienes permiso para cancelar esta compra"); this.name = "PurchaseCancelForbiddenError"; }
}

export class PurchasePayForbiddenError extends Error {
  constructor() { super("No tienes permiso para registrar abonos a proveedor"); this.name = "PurchasePayForbiddenError"; }
}

export class PurchasePayCancelForbiddenError extends Error {
  constructor() { super("No tienes permiso para cancelar este abono"); this.name = "PurchasePayCancelForbiddenError"; }
}

export class PurchaseScopingForbiddenError extends Error {
  constructor() { super("Sin acceso a esa sucursal"); this.name = "PurchaseScopingForbiddenError"; }
}
