export class EmptySaleError extends Error {
  constructor() {
    super("Sale must include at least one item");
    this.name = "EmptySaleError";
  }
}
