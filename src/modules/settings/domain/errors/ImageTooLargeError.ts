export class ImageTooLargeError extends Error {
  readonly maxBytes: number;
  constructor(maxBytes: number) {
    super("Image too large");
    this.name = "ImageTooLargeError";
    this.maxBytes = maxBytes;
  }
}
