export class TaxRateNotFoundError extends Error {
  constructor() { super("Tax rate not found"); this.name = "TaxRateNotFoundError"; }
}

export class TaxRateCodeAlreadyInUseError extends Error {
  constructor() { super("Tax rate code already in use"); this.name = "TaxRateCodeAlreadyInUseError"; }
}

export class TaxRateInUseByProductsError extends Error {
  readonly count: number;
  constructor(count: number) {
    super(`Tax rate is in use by ${count} active products`);
    this.name = "TaxRateInUseByProductsError";
    this.count = count;
  }
}
