export class ProviderHasDepartmentsError extends Error {
  constructor(public readonly departmentCount: number) {
    super("ProviderHasDepartments");
    this.name = "ProviderHasDepartmentsError";
  }
}
