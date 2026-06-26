export class TaxRateNotFoundError extends Error {
  constructor() { super("TaxRateNotFound"); this.name = "TaxRateNotFoundError"; }
}

export class TaxRateCodeAlreadyInUseError extends Error {
  constructor() { super("TaxRateCodeAlreadyInUse"); this.name = "TaxRateCodeAlreadyInUseError"; }
}

export class TaxRateInUseByProductsError extends Error {
  readonly count: number;
  constructor(count: number) {
    super("TaxRateInUseByProducts");
    this.name = "TaxRateInUseByProductsError";
    this.count = count;
  }
}
