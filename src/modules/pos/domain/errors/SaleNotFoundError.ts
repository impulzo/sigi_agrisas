export class SaleNotFoundError extends Error {
  constructor(id: string) {
    super(`Sale not found: ${id}`);
    this.name = "SaleNotFoundError";
  }
}
