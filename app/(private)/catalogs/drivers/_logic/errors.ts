export class DriverNotFoundError extends Error {
  constructor() {
    super("Driver not found");
    this.name = "DriverNotFoundError";
  }
}

export class DriverCodeAlreadyInUseError extends Error {
  constructor() {
    super("Driver code already in use");
    this.name = "DriverCodeAlreadyInUseError";
  }
}
