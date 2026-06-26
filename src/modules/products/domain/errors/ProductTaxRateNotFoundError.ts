export class ProductTaxRateNotFoundError extends Error {
  constructor(taxRateId: string) {
    super(`ProductTaxRateNotFound:${taxRateId}`);
    this.name = "ProductTaxRateNotFoundError";
  }
}
