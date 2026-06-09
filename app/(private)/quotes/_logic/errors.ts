export class QuoteNotFoundError extends Error {
  constructor() { super("Cotización no encontrada"); this.name = "QuoteNotFoundError"; }
}

export class QuoteNotEditableError extends Error {
  constructor(public readonly status: string) {
    super(`La cotización no es editable (estado: ${status})`);
    this.name = "QuoteNotEditableError";
  }
}

export class QuoteAlreadyCancelledError extends Error {
  constructor() { super("La cotización ya fue cancelada"); this.name = "QuoteAlreadyCancelledError"; }
}

export class QuoteAlreadyConvertedError extends Error {
  constructor(public readonly saleId: string) {
    super("La cotización ya fue convertida a venta");
    this.name = "QuoteAlreadyConvertedError";
  }
}

export class QuoteExpiredError extends Error {
  constructor() { super("La cotización ha vencido"); this.name = "QuoteExpiredError"; }
}

export class CustomerInactiveError extends Error {
  constructor() { super("El cliente seleccionado está inactivo"); this.name = "CustomerInactiveError"; }
}

export class BranchInactiveError extends Error {
  constructor() { super("La sucursal seleccionada está inactiva"); this.name = "BranchInactiveError"; }
}

export class FolioInactiveError extends Error {
  constructor() { super("El folio seleccionado está inactivo"); this.name = "FolioInactiveError"; }
}

export class PaymentMethodInactiveError extends Error {
  constructor() { super("La forma de pago seleccionada está inactiva"); this.name = "PaymentMethodInactiveError"; }
}

export class ProductInactiveError extends Error {
  constructor() { super("Uno o más productos están inactivos"); this.name = "ProductInactiveError"; }
}

export class ProductPriceMismatchError extends Error {
  constructor() { super("El precio no corresponde al producto indicado"); this.name = "ProductPriceMismatchError"; }
}

export class EmptyQuoteError extends Error {
  constructor() { super("La cotización debe tener al menos un artículo"); this.name = "EmptyQuoteError"; }
}

export class QuoteScopingForbiddenError extends Error {
  constructor() { super("Sin acceso a la sucursal de la cotización"); this.name = "QuoteScopingForbiddenError"; }
}

export class QuoteCreateForbiddenError extends Error {
  constructor() { super("Sin permiso para crear cotizaciones"); this.name = "QuoteCreateForbiddenError"; }
}

export class QuoteWriteForbiddenError extends Error {
  constructor() { super("Sin permiso para editar cotizaciones"); this.name = "QuoteWriteForbiddenError"; }
}

export class QuoteAuthorizeForbiddenError extends Error {
  constructor() { super("Sin permiso para autorizar cotizaciones"); this.name = "QuoteAuthorizeForbiddenError"; }
}

export class QuoteCancelForbiddenError extends Error {
  constructor() { super("Sin permiso para cancelar cotizaciones"); this.name = "QuoteCancelForbiddenError"; }
}

export class QuoteConvertForbiddenError extends Error {
  constructor() { super("Sin permiso para convertir cotizaciones"); this.name = "QuoteConvertForbiddenError"; }
}
