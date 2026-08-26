import { InMemoryProductPriceRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductPriceRepository";
import { DuplicatePriceNameError } from "@/modules/products/domain/errors/DuplicatePriceNameError";
import { DuplicateDefaultPriceError } from "@/modules/products/domain/errors/DuplicateDefaultPriceError";

const PRODUCT_ID = "product-1";
const ZARIOZ = "branch-zarioz";
const HUAJUAPAN = "branch-huajuapan";

describe("InMemoryProductPriceRepository — precio por sucursal", () => {
  it("findByProductId retorna únicamente los precios base", async () => {
    const repo = new InMemoryProductPriceRepository();
    await repo.create({ productId: PRODUCT_ID, name: "Precio Publico", price: 100, minQuantity: 1, isDefault: true });
    await repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 80, minQuantity: 1, isDefault: false });

    const bases = await repo.findByProductId(PRODUCT_ID);

    expect(bases).toHaveLength(1);
    expect(bases[0].branchId).toBeNull();
    expect(bases[0].price).toBe(100);
  });

  it("findEffectiveForBranch usa el override cuando existe", async () => {
    const repo = new InMemoryProductPriceRepository();
    await repo.create({ productId: PRODUCT_ID, name: "Precio Publico", price: 100, minQuantity: 1, isDefault: true });
    await repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 80, minQuantity: 1, isDefault: false });

    const effective = await repo.findEffectiveForBranch(PRODUCT_ID, ZARIOZ);

    expect(effective).toHaveLength(1);
    expect(effective[0].price).toBe(80);
    expect(effective[0].branchId).toBe(ZARIOZ);
  });

  it("findEffectiveForBranch hereda el base cuando la sucursal no tiene override", async () => {
    const repo = new InMemoryProductPriceRepository();
    await repo.create({ productId: PRODUCT_ID, name: "Precio Publico", price: 100, minQuantity: 1, isDefault: true });
    await repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 80, minQuantity: 1, isDefault: false });

    const effective = await repo.findEffectiveForBranch(PRODUCT_ID, HUAJUAPAN);

    expect(effective).toHaveLength(1);
    expect(effective[0].price).toBe(100);
    expect(effective[0].branchId).toBeNull();
  });

  it("el mismo name coexiste en el bucket base y en un bucket de sucursal", async () => {
    const repo = new InMemoryProductPriceRepository();
    await repo.create({ productId: PRODUCT_ID, name: "Precio Publico", price: 100, minQuantity: 1, isDefault: false });

    await expect(
      repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 80, minQuantity: 1, isDefault: false })
    ).resolves.toBeDefined();
  });

  it("dos overrides con el mismo name en la misma sucursal colisionan", async () => {
    const repo = new InMemoryProductPriceRepository();
    await repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 80, minQuantity: 1, isDefault: false });

    await expect(
      repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 90, minQuantity: 1, isDefault: false })
    ).rejects.toBeInstanceOf(DuplicatePriceNameError);
  });

  it("un default global y un default de sucursal coexisten sin colisionar", async () => {
    const repo = new InMemoryProductPriceRepository();
    await repo.create({ productId: PRODUCT_ID, name: "Precio Publico", price: 100, minQuantity: 1, isDefault: true });

    await expect(
      repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 80, minQuantity: 1, isDefault: true })
    ).resolves.toBeDefined();
  });

  it("un segundo default en el mismo bucket de sucursal colisiona", async () => {
    const repo = new InMemoryProductPriceRepository();
    await repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 80, minQuantity: 1, isDefault: true });

    await expect(
      repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Distri", price: 70, minQuantity: 1, isDefault: true })
    ).rejects.toBeInstanceOf(DuplicateDefaultPriceError);
  });

  it("findDefaultByProductId resuelve el default por bucket, con fallback opcional al global", async () => {
    const repo = new InMemoryProductPriceRepository();
    await repo.create({ productId: PRODUCT_ID, name: "Precio Publico", price: 100, minQuantity: 1, isDefault: true });
    await repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Publico", price: 80, minQuantity: 1, isDefault: true });

    const zariozDefault = await repo.findDefaultByProductId(PRODUCT_ID, ZARIOZ);
    const huajuapanDefault = await repo.findDefaultByProductId(PRODUCT_ID, HUAJUAPAN);
    const globalDefault = await repo.findDefaultByProductId(PRODUCT_ID);

    expect(zariozDefault?.price).toBe(80);
    expect(huajuapanDefault).toBeNull();
    expect(globalDefault?.price).toBe(100);
  });

  it("unsetDefaultAndUpdate sólo afecta el bucket del precio editado", async () => {
    const repo = new InMemoryProductPriceRepository();
    const globalDefault = await repo.create({ productId: PRODUCT_ID, name: "Precio Publico", price: 100, minQuantity: 1, isDefault: true });
    const zariozOther = await repo.create({ productId: PRODUCT_ID, branchId: ZARIOZ, name: "Precio Distri", price: 70, minQuantity: 1, isDefault: false });

    const promoted = await repo.unsetDefaultAndUpdate(PRODUCT_ID, ZARIOZ, zariozOther.id, { isDefault: true });

    expect(promoted.isDefault).toBe(true);
    const stillGlobalDefault = await repo.findById(globalDefault.id);
    expect(stillGlobalDefault?.isDefault).toBe(true);
  });
});
