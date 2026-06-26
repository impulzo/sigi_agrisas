export class DepartmentNotFoundError extends Error {
  constructor() {
    super("Department not found");
    this.name = "DepartmentNotFoundError";
  }
}

export class DepartmentCodeAlreadyInUseError extends Error {
  constructor() {
    super("Department code already in use");
    this.name = "DepartmentCodeAlreadyInUseError";
  }
}

export class ProviderNotFoundOrInactiveError extends Error {
  constructor() {
    super("Provider not found or inactive");
    this.name = "ProviderNotFoundOrInactiveError";
  }
}
