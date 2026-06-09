export class DuplicateDosificationNameError extends Error {
  constructor(name: string) {
    super(`A dosification named "${name}" already exists for this product`);
    this.name = "DuplicateDosificationNameError";
  }
}
