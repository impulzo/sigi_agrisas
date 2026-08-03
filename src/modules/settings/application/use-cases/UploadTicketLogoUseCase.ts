import type { TicketSettingsRepository } from "../ports/TicketSettingsRepository";
import type { TicketLogoStorage } from "../ports/TicketLogoStorage";
import { InvalidImageFormatError } from "../../domain/errors/InvalidImageFormatError";
import { ImageTooLargeError } from "../../domain/errors/ImageTooLargeError";

const ALLOWED_MIMES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export interface UploadTicketLogoInput {
  buffer: Buffer;
  mime: string;
  sizeBytes: number;
}

export class UploadTicketLogoUseCase {
  constructor(
    private readonly repo: TicketSettingsRepository,
    private readonly storage: TicketLogoStorage
  ) {}

  async execute({ buffer, mime, sizeBytes }: UploadTicketLogoInput): Promise<string> {
    const ext = ALLOWED_MIMES[mime];
    if (!ext) throw new InvalidImageFormatError();
    if (sizeBytes > MAX_BYTES) throw new ImageTooLargeError(MAX_BYTES);

    const current = await this.repo.get();
    if (current.logoUrl) {
      await this.storage.delete(current.logoUrl).catch(() => {});
    }

    const url = await this.storage.upload(buffer, mime, ext);
    await this.repo.updateLogoUrl(url);
    return url;
  }
}
