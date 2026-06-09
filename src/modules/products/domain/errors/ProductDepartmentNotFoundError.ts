export class ProductDepartmentNotFoundError extends Error {
  constructor(departmentId: string) {
    super(`Department not found or inactive: ${departmentId}`);
    this.name = "ProductDepartmentNotFoundError";
  }
}
