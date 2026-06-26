import { UploadProductImageUseCase } from "@/modules/products/application/use-cases/UploadProductImageUseCase";
import { DeleteProductImageUseCase } from "@/modules/products/application/use-cases/DeleteProductImageUseCase";
import { GetProductUseCase } from "@/modules/products/application/use-cases/GetProductUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryProductImageStorage } from "@/modules/products/infrastructure/services/InMemoryProductImageStorage";

const DEPT_ID = "dept-roundtrip";

async function setup() {
  const repo = new InMemoryProductRepository();
  repo.reset();
  repo.setDepartmentName(DEPT_ID, "Test Dept");
  await repo.create({ code: "RT001", name: "Roundtrip Product", unit: "kg", departmentId: DEPT_ID });
  const { product } = (await repo.findAll({ page: 1, pageSize: 10, includeInactive: false })).items[0];
  const storage = new InMemoryProductImageStorage();
  return {
    repo,
    storage,
    productId: product.id,
    uploadUc: new UploadProductImageUseCase(repo, storage),
    deleteUc: new DeleteProductImageUseCase(repo, storage),
    getUc: new GetProductUseCase(repo),
  };
}

describe("Product image roundtrip — POST → GET → DELETE (task 8.5)", () => {
  it("imageUrl is null before upload", async () => {
    const { getUc, productId } = await setup();
    const dto = await getUc.execute(productId);
    expect(dto.imageUrl).toBeNull();
  });

  it("upload persists imageUrl visible via GetProductUseCase", async () => {
    const { uploadUc, getUc, productId } = await setup();
    const url = await uploadUc.execute({
      productId,
      buffer: Buffer.from("img-data"),
      mime: "image/jpeg",
      sizeBytes: 8,
    });
    const dto = await getUc.execute(productId);
    expect(dto.imageUrl).toBe(url);
    expect(dto.imageUrl).toContain("storage.test");
  });

  it("delete clears imageUrl visible via GetProductUseCase", async () => {
    const { uploadUc, deleteUc, getUc, productId } = await setup();
    await uploadUc.execute({ productId, buffer: Buffer.from("x"), mime: "image/png", sizeBytes: 1 });
    await deleteUc.execute(productId);
    const dto = await getUc.execute(productId);
    expect(dto.imageUrl).toBeNull();
  });

  it("re-upload replaces old object; GET reflects new URL", async () => {
    const { uploadUc, getUc, storage, productId } = await setup();
    const first = await uploadUc.execute({ productId, buffer: Buffer.from("a"), mime: "image/jpeg", sizeBytes: 1 });
    const second = await uploadUc.execute({ productId, buffer: Buffer.from("b"), mime: "image/webp", sizeBytes: 1 });
    expect(storage.has(first)).toBe(false);
    expect(storage.has(second)).toBe(true);
    const dto = await getUc.execute(productId);
    expect(dto.imageUrl).toBe(second);
  });
});
