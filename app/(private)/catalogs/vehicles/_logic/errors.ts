export class VehicleNotFoundError extends Error {
  constructor() {
    super("Vehicle not found");
    this.name = "VehicleNotFoundError";
  }
}

export class VehicleCodeAlreadyInUseError extends Error {
  constructor() {
    super("Vehicle code already in use");
    this.name = "VehicleCodeAlreadyInUseError";
  }
}
