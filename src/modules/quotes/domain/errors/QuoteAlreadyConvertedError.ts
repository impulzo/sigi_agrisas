export class QuoteAlreadyConvertedError extends Error {
  readonly saleId: string;
  constructor(saleId: string) {
    super(
      "Converted quotes cannot be cancelled. Cancel the related sale instead."
    );
    this.name = "QuoteAlreadyConvertedError";
    this.saleId = saleId;
  }
}
