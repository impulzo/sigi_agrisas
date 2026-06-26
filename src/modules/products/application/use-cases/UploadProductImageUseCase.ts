import type { ProductRepository } from "../ports/ProductRepository";
import type { ProductImageStoragePort } from "../ports/ProductImageStoragePort";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";

const ALLOWED_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export class InvalidImageFormatError extends Error {
  constructor() { super("Invalid image format"); this.name = "InvalidImageFormatError"; }
}
export class ImageTooLargeError extends Error {
  readonly maxBytes = MAX_BYTES;
  constructor() { super("Image too large"); this.name = "ImageTooLargeError"; }
}

export interface UploadProductImageInput {
  productId: string;
  buffer: Buffer;
  mime: string;
  sizeBytes: number;
}

export class UploadProductImageUseCase {
  constructor(
    private readonly repo: ProductRepository,
    private readonly storage: ProductImageStoragePort,
  ) {}

  async execute({ productId, buffer, mime, sizeBytes }: UploadProductImageInput): Promise<string> {
    const ext = ALLOWED_MIMES[mime];
    if (!ext) throw new InvalidImageFormatError();
    if (sizeBytes > MAX_BYTES) throw new ImageTooLargeError();

    const product = await this.repo.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    // Delete previous image if present (best-effort)
    if (product.product.imageUrl) {
      await this.storage.delete(product.product.imageUrl).catch(() => {});
    }

    const url = await this.storage.upload(productId, buffer, mime, ext);
    await this.repo.update(productId, { imageUrl: url });
    return url;
  }
}
