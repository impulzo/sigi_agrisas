export class InvalidKardexRangeError extends Error {
  constructor() {
    super("`from` must be less than or equal to `to`");
    this.name = "InvalidKardexRangeError";
  }
}
