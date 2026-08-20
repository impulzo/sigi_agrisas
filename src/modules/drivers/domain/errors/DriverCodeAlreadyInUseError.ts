export class DriverCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Driver code already in use: ${code}`);
    this.name = "DriverCodeAlreadyInUseError";
  }
}
