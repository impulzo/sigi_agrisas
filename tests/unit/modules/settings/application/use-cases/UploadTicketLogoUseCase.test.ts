import { UploadTicketLogoUseCase } from "@/modules/settings/application/use-cases/UploadTicketLogoUseCase";
import { DeleteTicketLogoUseCase } from "@/modules/settings/application/use-cases/DeleteTicketLogoUseCase";
import { InMemoryTicketSettingsRepository } from "@/modules/settings/infrastructure/repositories/InMemoryTicketSettingsRepository";
import { InMemoryTicketLogoStorage } from "@/modules/settings/infrastructure/services/InMemoryTicketLogoStorage";
import { InvalidImageFormatError } from "@/modules/settings/domain/errors/InvalidImageFormatError";
import { ImageTooLargeError } from "@/modules/settings/domain/errors/ImageTooLargeError";

describe("UploadTicketLogoUseCase", () => {
  it("uploads a valid image and persists the logoUrl", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const storage = new InMemoryTicketLogoStorage();
    const uc = new UploadTicketLogoUseCase(repo, storage);

    const url = await uc.execute({ buffer: Buffer.from("fake"), mime: "image/png", sizeBytes: 1024 });

    expect(url).toContain("ticket-logo");
    await expect(repo.get()).resolves.toMatchObject({ logoUrl: url });
  });

  it("rejects an invalid mime type", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const storage = new InMemoryTicketLogoStorage();
    const uc = new UploadTicketLogoUseCase(repo, storage);

    await expect(
      uc.execute({ buffer: Buffer.from("fake"), mime: "application/pdf", sizeBytes: 1024 })
    ).rejects.toBeInstanceOf(InvalidImageFormatError);
  });

  it("rejects a file exceeding 2MB", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const storage = new InMemoryTicketLogoStorage();
    const uc = new UploadTicketLogoUseCase(repo, storage);

    await expect(
      uc.execute({ buffer: Buffer.from("fake"), mime: "image/png", sizeBytes: 3 * 1024 * 1024 })
    ).rejects.toBeInstanceOf(ImageTooLargeError);
  });

  it("best-effort deletes the previous logo when replacing it", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const storage = new InMemoryTicketLogoStorage();
    const uc = new UploadTicketLogoUseCase(repo, storage);
    const firstUrl = await uc.execute({ buffer: Buffer.from("a"), mime: "image/png", sizeBytes: 100 });

    await uc.execute({ buffer: Buffer.from("b"), mime: "image/jpeg", sizeBytes: 100 });

    expect(storage.deleted).toContain(firstUrl);
  });
});

describe("DeleteTicketLogoUseCase", () => {
  it("removes the logo and sets logoUrl to null", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const storage = new InMemoryTicketLogoStorage();
    const uploadUc = new UploadTicketLogoUseCase(repo, storage);
    const deleteUc = new DeleteTicketLogoUseCase(repo, storage);
    const url = await uploadUc.execute({ buffer: Buffer.from("a"), mime: "image/png", sizeBytes: 100 });

    await deleteUc.execute();

    await expect(repo.get()).resolves.toMatchObject({ logoUrl: null });
    expect(storage.deleted).toContain(url);
  });

  it("is a no-op when no logo exists", async () => {
    const repo = new InMemoryTicketSettingsRepository();
    const storage = new InMemoryTicketLogoStorage();
    const deleteUc = new DeleteTicketLogoUseCase(repo, storage);

    await expect(deleteUc.execute()).resolves.toBeUndefined();
    expect(storage.deleted).toHaveLength(0);
  });
});
