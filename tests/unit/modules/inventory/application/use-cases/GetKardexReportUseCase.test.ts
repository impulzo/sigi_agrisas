import { GetKardexReportUseCase } from "@/modules/inventory/application/use-cases/GetKardexReportUseCase";
import { InMemoryInventoryMovementRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryInventoryMovementRepository";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { InventoryMovement } from "@/modules/inventory/domain/entities/InventoryMovement";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";
import { InvalidKardexRangeError } from "@/modules/inventory/domain/errors/InvalidKardexRangeError";

const BRANCH_ID = "branch-1";

describe("GetKardexReportUseCase", () => {
  let movementRepo: InMemoryInventoryMovementRepository;
  let productRepo: InMemoryProductRepository;
  let useCase: GetKardexReportUseCase;
  let productId: string;

  beforeEach(async () => {
    movementRepo = new InMemoryInventoryMovementRepository();
    productRepo = new InMemoryProductRepository();
    productRepo.reset();
    useCase = new GetKardexReportUseCase(movementRepo, productRepo);

    const { product } = await productRepo.create({
      code: "PROD1",
      name: "Producto 1",
      unit: "PZA",
      departmentId: "dept-1",
    });
    productId = product.id;
  });

  it("throws ProductNotFoundError when the product does not exist", async () => {
    await expect(
      useCase.execute({ productId: "missing", from: new Date("2026-01-01"), to: new Date("2026-01-31") })
    ).rejects.toThrow(ProductNotFoundError);
  });

  it("throws InvalidKardexRangeError when from > to", async () => {
    await expect(
      useCase.execute({ productId, from: new Date("2026-02-01"), to: new Date("2026-01-01") })
    ).rejects.toThrow(InvalidKardexRangeError);
  });

  it("returns header + chronological movements for a single branch", async () => {
    movementRepo.setCurrentQuantity(BRANCH_ID, productId, 45);
    movementRepo.seed(
      InventoryMovement.create({
        id: "m1",
        branchId: BRANCH_ID,
        productId,
        movementAt: new Date("2026-01-05"),
        sequence: 1,
        movementType: "sale",
        direction: "OUT",
        quantity: 5,
        unit: "PZA",
        balanceAfter: 45,
        unitCost: null,
        unitPrice: 100,
        customerId: null,
        providerId: null,
        folioId: null,
        folioCode: "TK-000001",
        folioNumber: 1,
        originFolioCode: null,
        originFolioNumber: null,
        sourceType: "sale",
        sourceId: "sale-1",
        status: "Aplicada",
        notes: null,
        createdBy: null,
        createdAt: new Date("2026-01-05"),
      })
    );

    const result = await useCase.execute({
      productId,
      branchId: BRANCH_ID,
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    });

    expect(result.product.code).toBe("PROD1");
    expect(result.header.saldoFinal).toBe(45);
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0].salida).toBe(5);
  });

  it("returns empty movements with saldoFinal = saldoAnterior for a range with no data", async () => {
    const result = await useCase.execute({
      productId,
      branchId: BRANCH_ID,
      from: new Date("2026-01-01"),
      to: new Date("2026-01-31"),
    });

    expect(result.movements).toEqual([]);
    expect(result.header.saldoFinal).toBe(result.header.saldoAnterior);
  });
});
