export class WaybillNotFoundError extends Error {
  constructor(id: string) {
    super(`Waybill not found: ${id}`);
    this.name = "WaybillNotFoundError";
  }
}

export class InvalidBranchPairError extends Error {
  constructor(reason: string) {
    super(`Invalid branch pair: ${reason}`);
    this.name = "InvalidBranchPairError";
  }
}

export class BranchAddressIncompleteError extends Error {
  readonly branchId: string;
  readonly missingFields: string[];
  constructor(branchId: string, missingFields: string[]) {
    super(`Branch ${branchId} has incomplete address: ${missingFields.join(", ")}`);
    this.name = "BranchAddressIncompleteError";
    this.branchId = branchId;
    this.missingFields = missingFields;
  }
}

export class InsufficientStockAtOriginError extends Error {
  readonly productId: string;
  constructor(productId: string) {
    super(`Insufficient stock at origin for product ${productId}`);
    this.name = "InsufficientStockAtOriginError";
    this.productId = productId;
  }
}

export class WaybillAlreadyCancelledError extends Error {
  constructor(id: string) {
    super(`Waybill ${id} is already cancelled`);
    this.name = "WaybillAlreadyCancelledError";
  }
}

export class WaybillNotStampedError extends Error {
  constructor(id: string) {
    super(`Waybill ${id} is not stamped`);
    this.name = "WaybillNotStampedError";
  }
}

export class FacturamaStampError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Facturama stamp error: ${detail}`);
    this.name = "FacturamaStampError";
    this.detail = detail;
  }
}

export class FacturamaCancelError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(`Facturama cancel error: ${detail}`);
    this.name = "FacturamaCancelError";
    this.detail = detail;
  }
}

export class BranchScopeViolationError extends Error {
  constructor() {
    super("Branch scope violation");
    this.name = "BranchScopeViolationError";
  }
}

export class ProductRequiredForSimpleTransferError extends Error {
  readonly itemIndex: number;
  constructor(itemIndex: number) {
    super(`Line ${itemIndex} requires a catalog productId for a simple transfer`);
    this.name = "ProductRequiredForSimpleTransferError";
    this.itemIndex = itemIndex;
  }
}

export class ProductNotFoundForTransferError extends Error {
  readonly productId: string;
  constructor(productId: string) {
    super(`Product not found: ${productId}`);
    this.name = "ProductNotFoundForTransferError";
    this.productId = productId;
  }
}

export class CanonicalFolioMissingError extends Error {
  readonly folioCode: string;
  constructor(folioCode: string) {
    super(`Canonical folio '${folioCode}' not found or inactive`);
    this.name = "CanonicalFolioMissingError";
    this.folioCode = folioCode;
  }
}

export class WaybillSaleNotFoundError extends Error {
  readonly saleId: string;
  constructor(saleId: string) {
    super(`Sale not found: ${saleId}`);
    this.name = "WaybillSaleNotFoundError";
    this.saleId = saleId;
  }
}

export class SaleNotCompletedError extends Error {
  readonly saleId: string;
  constructor(saleId: string) {
    super(`Sale ${saleId} is not completed`);
    this.name = "SaleNotCompletedError";
    this.saleId = saleId;
  }
}

export class SaleHasNoCustomerError extends Error {
  readonly saleId: string;
  constructor(saleId: string) {
    super(`Sale ${saleId} has no customer`);
    this.name = "SaleHasNoCustomerError";
    this.saleId = saleId;
  }
}

export class CustomerNotFoundForWaybillError extends Error {
  readonly customerId: string;
  constructor(customerId: string) {
    super(`Customer not found or inactive: ${customerId}`);
    this.name = "CustomerNotFoundForWaybillError";
    this.customerId = customerId;
  }
}

export class CustomerAddressIncompleteError extends Error {
  readonly customerId: string;
  readonly missingFields: string[];
  constructor(customerId: string, missingFields: string[]) {
    super(`Customer ${customerId} has incomplete address: ${missingFields.join(", ")}`);
    this.name = "CustomerAddressIncompleteError";
    this.customerId = customerId;
    this.missingFields = missingFields;
  }
}

export class VehicleNotFoundForWaybillError extends Error {
  readonly vehicleId: string;
  constructor(vehicleId: string) {
    super(`Vehicle not found: ${vehicleId}`);
    this.name = "VehicleNotFoundForWaybillError";
    this.vehicleId = vehicleId;
  }
}

export class DriverNotFoundForWaybillError extends Error {
  readonly driverId: string;
  constructor(driverId: string) {
    super(`Driver not found: ${driverId}`);
    this.name = "DriverNotFoundForWaybillError";
    this.driverId = driverId;
  }
}

export class EmitterFiscalDataIncompleteError extends Error {
  constructor() {
    super("Emitter fiscal data (RFC, legal name, fiscal regime, zip code) is incomplete");
    this.name = "EmitterFiscalDataIncompleteError";
  }
}
