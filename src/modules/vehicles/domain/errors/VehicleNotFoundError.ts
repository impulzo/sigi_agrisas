export class VehicleNotFoundError extends Error {
  constructor(id: string) {
    super(`Vehicle not found: ${id}`);
    this.name = "VehicleNotFoundError";
  }
}
