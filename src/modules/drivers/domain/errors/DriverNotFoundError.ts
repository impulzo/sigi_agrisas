export class DriverNotFoundError extends Error {
  constructor(id: string) {
    super(`Driver not found: ${id}`);
    this.name = "DriverNotFoundError";
  }
}
