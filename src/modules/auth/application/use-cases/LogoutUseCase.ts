export class LogoutUseCase {
  execute(): void {
    // Cookie clearing is handled at the HTTP adapter layer.
    // This use case is a placeholder for future revocation logic (e.g., token blacklist).
  }
}
