export class ProviderRfcAlreadyInUseError extends Error {
  constructor(rfc: string) {
    super(`Provider RFC already in use: ${rfc}`);
    this.name = "ProviderRfcAlreadyInUseError";
  }
}
