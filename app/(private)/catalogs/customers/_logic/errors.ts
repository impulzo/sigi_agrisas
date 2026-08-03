export class CustomerNotFoundError extends Error {
  constructor() {
    super("Customer not found");
    this.name = "CustomerNotFoundError";
  }
}

export class CustomerCodeAlreadyInUseError extends Error {
  constructor() {
    super("Customer code already in use");
    this.name = "CustomerCodeAlreadyInUseError";
  }
}

export class CustomerRfcAlreadyInUseError extends Error {
  constructor() {
    super("Customer RFC already in use");
    this.name = "CustomerRfcAlreadyInUseError";
  }
}
