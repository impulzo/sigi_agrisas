export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  key: string;
  description: string | null;
}

export class RoleNotFoundError extends Error {
  constructor() {
    super("Rol no encontrado");
    this.name = "RoleNotFoundError";
  }
}

export class PermissionNotFoundError extends Error {
  constructor() {
    super("Permiso no encontrado");
    this.name = "PermissionNotFoundError";
  }
}

export class PermissionAlreadyGrantedError extends Error {
  constructor() {
    super("Este permiso ya está asignado al rol");
    this.name = "PermissionAlreadyGrantedError";
  }
}

export class RoleAlreadyExistsError extends Error {
  constructor() {
    super("Ya existe un rol con este nombre");
    this.name = "RoleAlreadyExistsError";
  }
}

export class ValidationError extends Error {
  constructor(public details: unknown) {
    super("Validation error");
    this.name = "ValidationError";
  }
}
