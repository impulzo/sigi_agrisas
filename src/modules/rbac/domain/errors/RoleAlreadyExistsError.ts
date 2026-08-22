export class RoleAlreadyExistsError extends Error {
  constructor(name: string) {
    super(`Ya existe un rol con este nombre: ${name}`);
    this.name = "RoleAlreadyExistsError";
  }
}
