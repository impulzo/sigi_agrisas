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

export class PasswordNotSetError extends AuthError {
  constructor() {
    super("Debes establecer tu contraseña. Revisa tu correo o pide al administrador reenviarlo.");
    this.name = "PasswordNotSetError";
  }
}

export class PasswordSetupTokenInvalidError extends AuthError {
  constructor() {
    super("Este enlace ya no es válido. Pide al administrador que te reenvíe el correo.");
    this.name = "PasswordSetupTokenInvalidError";
  }
}

export class PasswordSetupTokenExpiredError extends AuthError {
  constructor() {
    super("Este enlace expiró. Pide al administrador que te reenvíe el correo.");
    this.name = "PasswordSetupTokenExpiredError";
  }
}
