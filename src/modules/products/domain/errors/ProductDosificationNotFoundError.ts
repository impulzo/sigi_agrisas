export class ProductDosificationNotFoundError extends Error {
  constructor(id: string) {
    super(`Product dosification not found: ${id}`);
    this.name = "ProductDosificationNotFoundError";
  }
}
