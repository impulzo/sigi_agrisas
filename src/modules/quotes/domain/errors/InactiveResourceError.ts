export class InactiveResourceError extends Error {
  constructor(resource: string) {
    super(`${resource} is inactive`);
    this.name = "InactiveResourceError";
  }
}
