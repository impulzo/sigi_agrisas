export class ProductCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Product code already in use: ${code}`);
    this.name = "ProductCodeAlreadyInUseError";
  }
}
