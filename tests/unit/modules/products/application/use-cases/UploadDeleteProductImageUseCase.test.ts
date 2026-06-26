import { UploadProductImageUseCase, InvalidImageFormatError, ImageTooLargeError } from "@/modules/products/application/use-cases/UploadProductImageUseCase";
import { DeleteProductImageUseCase } from "@/modules/products/application/use-cases/DeleteProductImageUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryProductImageStorage } from "@/modules/products/infrastructure/services/InMemoryProductImageStorage";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";

const DEPT_ID = "dept-1";

async function makeRepo() {
  const repo = new InMemoryProductRepository();
  repo.reset();
  repo.setDepartmentName(DEPT_ID, "Test Dept");
  await repo.create({ code: "P001", name: "Prod", unit: "kg", departmentId: DEPT_ID });
  const { product } = (await repo.findAll({ page: 1, pageSize: 10, includeInactive: false })).items[0];
  return { repo, productId: product.id };
}

describe("UploadProductImageUseCase", () => {
  it("uploads image and persists URL", async () => {
    const { repo, productId } = await makeRepo();
    const storage = new InMemoryProductImageStorage();
    const uc = new UploadProductImageUseCase(repo, storage);

    const url = await uc.execute({
      productId,
      buffer: Buffer.from("fake"),
      mime: "image/png",
      sizeBytes: 100,
    });

    expect(url).toContain("storage.test");
    const updated = await repo.findById(productId);
    expect(updated!.product.imageUrl).toBe(url);
  });

  it("deletes previous object on re-upload", async () => {
    const { repo, productId } = await makeRepo();
    const storage = new InMemoryProductImageStorage();
    const uc = new UploadProductImageUseCase(repo, storage);

    const first = await uc.execute({ productId, buffer: Buffer.from("a"), mime: "image/jpeg", sizeBytes: 1 });
    const second = await uc.execute({ productId, buffer: Buffer.from("b"), mime: "image/png", sizeBytes: 1 });

    expect(storage.has(first)).toBe(false);
    expect(storage.has(second)).toBe(true);
  });

  it("throws InvalidImageFormatError for unsupported MIME", async () => {
    const { repo, productId } = await makeRepo();
    const storage = new InMemoryProductImageStorage();
    const uc = new UploadProductImageUseCase(repo, storage);
    await expect(
      uc.execute({ productId, buffer: Buffer.from("x"), mime: "application/pdf", sizeBytes: 100 })
    ).rejects.toThrow(InvalidImageFormatError);
  });

  it("throws ImageTooLargeError when size > 2 MB", async () => {
    const { repo, productId } = await makeRepo();
    const storage = new InMemoryProductImageStorage();
    const uc = new UploadProductImageUseCase(repo, storage);
    await expect(
      uc.execute({ productId, buffer: Buffer.alloc(1), mime: "image/jpeg", sizeBytes: 3 * 1024 * 1024 })
    ).rejects.toThrow(ImageTooLargeError);
  });

  it("throws ProductNotFoundError for unknown product", async () => {
    const repo = new InMemoryProductRepository();
    repo.reset();
    const storage = new InMemoryProductImageStorage();
    const uc = new UploadProductImageUseCase(repo, storage);
    await expect(
      uc.execute({ productId: "no-such-id", buffer: Buffer.from("x"), mime: "image/png", sizeBytes: 10 })
    ).rejects.toThrow(ProductNotFoundError);
  });
});

describe("DeleteProductImageUseCase", () => {
  it("deletes storage object and clears imageUrl", async () => {
    const { repo, productId } = await makeRepo();
    const storage = new InMemoryProductImageStorage();
    const uploadUc = new UploadProductImageUseCase(repo, storage);
    const deleteUc = new DeleteProductImageUseCase(repo, storage);

    const url = await uploadUc.execute({ productId, buffer: Buffer.from("img"), mime: "image/webp", sizeBytes: 3 });
    await deleteUc.execute(productId);

    expect(storage.has(url)).toBe(false);
    const updated = await repo.findById(productId);
    expect(updated!.product.imageUrl).toBeNull();
  });

  it("is idempotent when imageUrl already null", async () => {
    const { repo, productId } = await makeRepo();
    const storage = new InMemoryProductImageStorage();
    const uc = new DeleteProductImageUseCase(repo, storage);
    await expect(uc.execute(productId)).resolves.toBeUndefined();
  });

  it("throws ProductNotFoundError for unknown product", async () => {
    const repo = new InMemoryProductRepository();
    repo.reset();
    const storage = new InMemoryProductImageStorage();
    const uc = new DeleteProductImageUseCase(repo, storage);
    await expect(uc.execute("ghost")).rejects.toThrow(ProductNotFoundError);
  });
});
