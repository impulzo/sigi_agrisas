export class SaleNotFoundError extends Error {
  constructor() { super("Venta no encontrada"); this.name = "SaleNotFoundError"; }
}

export class CancelledSaleNotEditableError extends Error {
  constructor() { super("No se puede editar una venta cancelada"); this.name = "CancelledSaleNotEditableError"; }
}

export class SaleNotInHeadquartersError extends Error {
  constructor() { super("La edición de ventas solo está disponible desde la matriz"); this.name = "SaleNotInHeadquartersError"; }
}

export class SaleScopingForbiddenError extends Error {
  constructor() { super("Sin acceso a esa sucursal"); this.name = "SaleScopingForbiddenError"; }
}

export class SaleAlreadyFullyReturnedError extends Error {
  constructor() { super("Esta venta ya fue devuelta en su totalidad"); this.name = "SaleAlreadyFullyReturnedError"; }
}
