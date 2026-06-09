export class InactiveCustomerError extends Error {
  constructor(id: string) {
    super(`Customer is inactive: ${id}`);
    this.name = "InactiveCustomerError";
  }
}
