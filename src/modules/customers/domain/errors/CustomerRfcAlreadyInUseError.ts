export class CustomerRfcAlreadyInUseError extends Error {
  constructor(rfc: string) {
    super(`Customer RFC already in use: ${rfc}`);
    this.name = "CustomerRfcAlreadyInUseError";
  }
}
