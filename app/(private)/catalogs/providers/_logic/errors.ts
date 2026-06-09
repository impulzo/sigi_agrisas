export class ProviderNotFoundError extends Error {
  constructor() {
    super("Provider not found");
    this.name = "ProviderNotFoundError";
  }
}

export class ProviderCodeAlreadyInUseError extends Error {
  constructor() {
    super("Provider code already in use");
    this.name = "ProviderCodeAlreadyInUseError";
  }
}

export class ProviderRfcAlreadyInUseError extends Error {
  constructor() {
    super("Provider RFC already in use");
    this.name = "ProviderRfcAlreadyInUseError";
  }
}
