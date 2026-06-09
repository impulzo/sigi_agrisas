import { QuoteStatus } from "../value-objects/QuoteStatus";

export class QuoteAlreadyAuthorizedError extends Error {
  readonly status: QuoteStatus;
  constructor(status: QuoteStatus) {
    super("Quote cannot be authorized in current status");
    this.name = "QuoteAlreadyAuthorizedError";
    this.status = status;
  }
}
