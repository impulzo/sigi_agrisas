export class ReturnQuantityExceedsRemainingError extends Error {
  readonly saleItemId: string;
  readonly requested: number;
  readonly remaining: number;
  constructor(saleItemId: string, requested: number, remaining: number) {
    super(
      `Return quantity ${requested} exceeds remaining ${remaining} for saleItemId ${saleItemId}`
    );
    this.name = "ReturnQuantityExceedsRemainingError";
    this.saleItemId = saleItemId;
    this.requested = requested;
    this.remaining = remaining;
  }
}
