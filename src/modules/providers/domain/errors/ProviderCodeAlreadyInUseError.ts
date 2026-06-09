export class ProviderCodeAlreadyInUseError extends Error {
  constructor(code: string) {
    super(`Provider code already in use: ${code}`);
    this.name = "ProviderCodeAlreadyInUseError";
  }
}
