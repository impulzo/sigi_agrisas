export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  accessToken: string;
  user: User;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("Credenciales inválidas");
    this.name = "InvalidCredentialsError";
  }
}

export class EmailAlreadyExistsError extends AuthError {
  constructor() {
    super("Este correo ya está registrado");
    this.name = "EmailAlreadyExistsError";
  }
}

export class NetworkError extends AuthError {
  constructor(message = "Error de red") {
    super(message);
    this.name = "NetworkError";
  }
}
