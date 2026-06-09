export class CustomerCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Customer code already in use: ${code}`);
    this.name = "CustomerCodeAlreadyInUseError";
  }
}
