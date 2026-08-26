import { CreateProductPriceUseCase, BranchActiveLookup } from "@/modules/products/application/use-cases/CreateProductPriceUseCase";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InMemoryProductPriceRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductPriceRepository";
import { DuplicateDefaultPriceError } from "@/modules/products/domain/errors/DuplicateDefaultPriceError";
import { ProductPriceInvalidBranchError } from "@/modules/products/domain/errors/ProductPriceInvalidBranchError";

const DEPT = "11111111-1111-1111-1111-111111111111";
const ZARIOZ = "22222222-2222-2222-2222-222222222222";
const INACTIVE_BRANCH = "33333333-3333-3333-3333-333333333333";
const UNKNOWN_BRANCH = "44444444-4444-4444-4444-444444444444";

class FakeBranchLookup implements BranchActiveLookup {
  async findById(id: string) {
    if (id === ZARIOZ) return { isActive: true };
    if (id === INACTIVE_BRANCH) return { isActive: false };
    return null;
  }
}

describe("CreateProductPriceUseCase — precio por sucursal", () => {
  let productRepo: InMemoryProductRepository;
  let priceRepo: InMemoryProductPriceRepository;
  let useCase: CreateProductPriceUseCase;
  let productId: string;

  beforeEach(async () => {
    productRepo = new InMemoryProductRepository();
    priceRepo = new InMemoryProductPriceRepository();
    useCase = new CreateProductPriceUseCase(productRepo, priceRepo, new FakeBranchLookup());
    const created = await productRepo.create({ code: "P1", name: "Fertilizante", unit: "kg", departmentId: DEPT });
    productId = created.product.id;
  });

  it("crea un override para una sucursal activa sin colisionar con el nombre del base", async () => {
    await useCase.execute(productId, { name: "Precio Publico", price: 3666.65 });
    const override = await useCase.execute(productId, { name: "Precio Publico", price: 699.35, branchId: ZARIOZ });

    expect(override.branchId).toBe(ZARIOZ);
    expect(override.isOverride).toBe(true);
    expect(override.price).toBe(699.35);
  });

  it("rechaza branchId de sucursal inactiva", async () => {
    await expect(
      useCase.execute(productId, { name: "Precio Publico", price: 100, branchId: INACTIVE_BRANCH })
    ).rejects.toThrow(ProductPriceInvalidBranchError);
  });

  it("rechaza branchId de sucursal inexistente", async () => {
    await expect(
      useCase.execute(productId, { name: "Precio Publico", price: 100, branchId: UNKNOWN_BRANCH })
    ).rejects.toThrow(ProductPriceInvalidBranchError);
  });

  it("un default global y un default de sucursal coexisten sin colisionar", async () => {
    await useCase.execute(productId, { name: "Precio Publico", price: 100, isDefault: true });
    const branchDefault = await useCase.execute(productId, {
      name: "Precio Publico",
      price: 80,
      isDefault: true,
      branchId: ZARIOZ,
    });
    expect(branchDefault.isDefault).toBe(true);
  });

  it("un segundo default en la misma sucursal colisiona", async () => {
    await useCase.execute(productId, { name: "Precio Publico", price: 80, isDefault: true, branchId: ZARIOZ });
    await expect(
      useCase.execute(productId, { name: "Precio Distri", price: 70, isDefault: true, branchId: ZARIOZ })
    ).rejects.toThrow(DuplicateDefaultPriceError);
  });
});
