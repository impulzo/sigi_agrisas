export class ReturnNotFoundError extends Error {
  constructor() { super("Devolución no encontrada"); this.name = "ReturnNotFoundError"; }
}

export class ReturnAlreadyCancelledError extends Error {
  constructor() { super("La devolución ya está cancelada"); this.name = "ReturnAlreadyCancelledError"; }
}

export class SaleNotReturnableError extends Error {
  readonly saleStatus: string;
  constructor(status: string) {
    super("Esta venta no acepta devoluciones");
    this.name = "SaleNotReturnableError";
    this.saleStatus = status;
  }
}

export class ReturnItemsEmptyError extends Error {
  constructor() { super("Selecciona al menos un producto para devolver"); this.name = "ReturnItemsEmptyError"; }
}

export class SaleItemNotPartOfSaleError extends Error {
  readonly saleItemId: string;
  constructor(saleItemId: string) {
    super("Un producto no pertenece a la venta referenciada");
    this.name = "SaleItemNotPartOfSaleError";
    this.saleItemId = saleItemId;
  }
}

export class ReturnQuantityExceedsRemainingError extends Error {
  readonly saleItemId: string;
  readonly requested: number;
  readonly remaining: number;
  constructor(saleItemId: string, requested: number, remaining: number) {
    super("La cantidad a devolver excede la disponible");
    this.name = "ReturnQuantityExceedsRemainingError";
    this.saleItemId = saleItemId;
    this.requested = requested;
    this.remaining = remaining;
  }
}

export class SaleNotFoundError extends Error {
  constructor() { super("Venta no encontrada"); this.name = "SaleNotFoundError"; }
}

export class ReturnReadForbiddenError extends Error {
  constructor() { super("No tienes permiso para ver devoluciones"); this.name = "ReturnReadForbiddenError"; }
}

export class ReturnCreateForbiddenError extends Error {
  constructor() { super("No tienes permiso para registrar devoluciones"); this.name = "ReturnCreateForbiddenError"; }
}

export class ReturnCancelForbiddenError extends Error {
  constructor() { super("No tienes permiso para cancelar esta devolución"); this.name = "ReturnCancelForbiddenError"; }
}

export class ReturnScopingForbiddenError extends Error {
  constructor() { super("Sin acceso a esa sucursal"); this.name = "ReturnScopingForbiddenError"; }
}
