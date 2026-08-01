export class StatementCustomerNotFoundError extends Error {
  constructor(customerId: string) {
    super(`Customer ${customerId} not found`);
    this.name = "StatementCustomerNotFoundError";
  }
}
