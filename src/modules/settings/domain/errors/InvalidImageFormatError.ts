export class InvalidImageFormatError extends Error {
  constructor() {
    super("Invalid image format");
    this.name = "InvalidImageFormatError";
  }
}
