export class SaleNotPayableError extends Error {
  readonly status?: string;
  readonly reason?: string;

  constructor(opts: { status?: string; reason?: string } = {}) {
    const msg = opts.status
      ? `Sale with status '${opts.status}' cannot receive payments`
      : opts.reason === "not_credit"
      ? "Sale payment method is not a credit method"
      : "Sale is not payable";
    super(msg);
    this.name = "SaleNotPayableError";
    this.status = opts.status;
    this.reason = opts.reason;
  }
}
