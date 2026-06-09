export class DuplicatePriceNameError extends Error {
  constructor(name: string) {
    super(`A price named "${name}" already exists for this product`);
    this.name = "DuplicatePriceNameError";
  }
}
