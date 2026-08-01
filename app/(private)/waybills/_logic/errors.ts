export class WaybillNotFoundError extends Error {
  constructor() { super("Traspaso no encontrado"); this.name = "WaybillNotFoundError"; }
}

export class WaybillAlreadyCancelledError extends Error {
  constructor() { super("El traspaso ya está cancelado"); this.name = "WaybillAlreadyCancelledError"; }
}

export class WaybillNotStampedError extends Error {
  constructor() { super("El traspaso no tiene CFDI timbrado"); this.name = "WaybillNotStampedError"; }
}

export class InvalidBranchPairError extends Error {
  constructor() { super("Sucursales de origen y destino inválidas"); this.name = "InvalidBranchPairError"; }
}

export class BranchAddressIncompleteError extends Error {
  readonly branchId: string;
  readonly missingFields: string[];
  constructor(branchId: string, missingFields: string[]) {
    super("El domicilio fiscal de la sucursal está incompleto");
    this.name = "BranchAddressIncompleteError";
    this.branchId = branchId;
    this.missingFields = missingFields;
  }
}

export class InsufficientStockAtOriginError extends Error {
  readonly productId: string;
  constructor(productId: string) {
    super("Stock insuficiente en la sucursal de origen");
    this.name = "InsufficientStockAtOriginError";
    this.productId = productId;
  }
}

export class FacturamaStampError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super("Facturama rechazó el timbrado");
    this.name = "FacturamaStampError";
    this.detail = detail;
  }
}

export class WaybillReadForbiddenError extends Error {
  constructor() { super("No tienes permiso para ver traspasos"); this.name = "WaybillReadForbiddenError"; }
}

export class WaybillWriteForbiddenError extends Error {
  constructor() { super("No tienes permiso para crear traspasos"); this.name = "WaybillWriteForbiddenError"; }
}

export class WaybillCancelForbiddenError extends Error {
  constructor() { super("No tienes permiso para cancelar este traspaso"); this.name = "WaybillCancelForbiddenError"; }
}

export class WaybillScopingForbiddenError extends Error {
  constructor() { super("Sin acceso a esa sucursal"); this.name = "WaybillScopingForbiddenError"; }
}
