import { QuoteStatus } from "../value-objects/QuoteStatus";

export class QuoteNotEditableError extends Error {
  readonly status: QuoteStatus;
  constructor(status: QuoteStatus) {
    super("Quote cannot be edited in current status");
    this.name = "QuoteNotEditableError";
    this.status = status;
  }
}
