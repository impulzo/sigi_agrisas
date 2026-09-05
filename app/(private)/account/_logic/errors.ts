export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("El correo ya está en uso por otra cuenta");
    this.name = "EmailAlreadyInUseError";
  }
}

export class PasswordLinkSendError extends Error {
  constructor(message = "No se pudo enviar el correo de cambio de contraseña.") {
    super(message);
    this.name = "PasswordLinkSendError";
  }
}

export class AccountLoadError extends Error {
  constructor(message = "No se pudo cargar la información de tu cuenta.") {
    super(message);
    this.name = "AccountLoadError";
  }
}

export class PasswordLinkRateLimitedError extends Error {
  retryAfterSeconds?: number;
  constructor(retryAfterSeconds?: number) {
    super(
      retryAfterSeconds
        ? `Espera ${retryAfterSeconds} segundos antes de solicitar otro enlace.`
        : "Espera un momento antes de solicitar otro enlace."
    );
    this.name = "PasswordLinkRateLimitedError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
