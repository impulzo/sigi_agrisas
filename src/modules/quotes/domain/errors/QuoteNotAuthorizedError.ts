import { QuoteStatus } from "../value-objects/QuoteStatus";

export class QuoteNotAuthorizedError extends Error {
  readonly status: QuoteStatus;
  constructor(status: QuoteStatus) {
    super("Quote must be authorized before converting");
    this.name = "QuoteNotAuthorizedError";
    this.status = status;
  }
}
