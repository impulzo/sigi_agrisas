/**
 * Raised by CreateSaleUseCase when a sale body includes a `quoteId` that cannot
 * legally be linked to a new sale. Reasons:
 *  - quote does not exist
 *  - quote is not authorized OR already converted
 *  - quote.branchId / quote.customerId mismatch the sale body
 *
 * Mapped to HTTP 400 by SalesController.
 */
export class QuoteLinkInvalidError extends Error {
  constructor(message: string, readonly reason: "not_found" | "wrong_status" | "branch_mismatch" | "customer_mismatch") {
    super(message);
    this.name = "QuoteLinkInvalidError";
  }
}
