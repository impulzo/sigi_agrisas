export class CustomerInactiveError extends Error {
  constructor() { super("El cliente está inactivo"); this.name = "CustomerInactiveError"; }
}

export class BranchInactiveError extends Error {
  constructor() { super("La sucursal está inactiva"); this.name = "BranchInactiveError"; }
}

export class FolioInactiveError extends Error {
  constructor() { super("El folio está inactivo"); this.name = "FolioInactiveError"; }
}

export class PaymentMethodInactiveError extends Error {
  constructor() { super("El método de pago está inactivo"); this.name = "PaymentMethodInactiveError"; }
}

export class ProductInactiveError extends Error {
  constructor(public productCode?: string) {
    super(`El producto ${productCode ?? ""} está inactivo`);
    this.name = "ProductInactiveError";
  }
}

export class ProductPriceMismatchError extends Error {
  constructor() { super("El precio no corresponde al producto"); this.name = "ProductPriceMismatchError"; }
}

export class EmptyCartError extends Error {
  constructor() { super("El carrito está vacío"); this.name = "EmptyCartError"; }
}

export class SaleScopingForbiddenError extends Error {
  constructor() { super("Sin acceso a esa sucursal"); this.name = "SaleScopingForbiddenError"; }
}

export class SaleCreateForbiddenError extends Error {
  constructor() { super("Sin permiso para emitir ventas"); this.name = "SaleCreateForbiddenError"; }
}

export class CustomerCodeAlreadyInUseError extends Error {
  constructor() { super("El código de cliente ya está en uso"); this.name = "CustomerCodeAlreadyInUseError"; }
}

export class CustomerRfcAlreadyInUseError extends Error {
  constructor() { super("El RFC ya está en uso por otro cliente"); this.name = "CustomerRfcAlreadyInUseError"; }
}

export class FolioScopeMismatchError extends Error {
  constructor(public readonly expected: string, public readonly actual: string) {
    super(`El folio seleccionado es de tipo ${actual}, pero este flujo requiere uno de tipo ${expected}.`);
    this.name = "FolioScopeMismatchError";
  }
}
