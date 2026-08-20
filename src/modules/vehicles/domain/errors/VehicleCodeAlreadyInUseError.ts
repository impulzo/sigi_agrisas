export class VehicleCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Vehicle code already in use: ${code}`);
    this.name = "VehicleCodeAlreadyInUseError";
  }
}
