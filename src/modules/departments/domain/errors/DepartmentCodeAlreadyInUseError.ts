export class DepartmentCodeAlreadyInUseError extends Error {
  constructor() {
    super("Department code already in use");
    this.name = "DepartmentCodeAlreadyInUseError";
  }
}
