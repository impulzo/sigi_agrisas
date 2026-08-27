import { Prisma } from "@prisma/client";
import { recordInventoryMovement } from "@/shared/infrastructure/inventory/recordInventoryMovement";
import { BranchInventoryRowMissingError } from "@/shared/domain/errors/BranchInventoryRowMissingError";

function makeTx(queryRawResult: unknown[] = []) {
  return {
    $queryRaw: jest.fn().mockResolvedValue(queryRawResult),
    branchInventory: {
      create: jest.fn().mockResolvedValue({
        quantity: new Prisma.Decimal(5),
        reorderPoint: new Prisma.Decimal(0),
      }),
    },
    product: {
      findUnique: jest.fn().mockResolvedValue({ unit: "PZA", name: "Producto", code: "P1" }),
    },
    satUnitOfMeasure: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    inventoryMovement: {
      create: jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as Parameters<typeof recordInventoryMovement>[0];
}

const baseData = {
  branchId: "b1",
  productId: "p1",
  movementAt: new Date(),
  movementType: "sale" as const,
  direction: "OUT" as const,
  quantity: 5,
  sourceType: "sale" as const,
  sourceId: "sale-1",
};

describe("recordInventoryMovement — allowRowCreation", () => {
  it("crea la fila cuando no existe y allowRowCreation no se especifica (default true)", async () => {
    const tx = makeTx([]);
    const result = await recordInventoryMovement(tx, baseData);
    expect((tx as unknown as { branchInventory: { create: jest.Mock } }).branchInventory.create).toHaveBeenCalledTimes(1);
    expect(result.balanceAfter).toBe(5);
  });

  it("crea la fila cuando allowRowCreation=true explícito", async () => {
    const tx = makeTx([]);
    await recordInventoryMovement(tx, { ...baseData, allowRowCreation: true });
    expect((tx as unknown as { branchInventory: { create: jest.Mock } }).branchInventory.create).toHaveBeenCalledTimes(1);
  });

  it("lanza BranchInventoryRowMissingError cuando allowRowCreation=false y no existe fila", async () => {
    const tx = makeTx([]);
    await expect(recordInventoryMovement(tx, { ...baseData, allowRowCreation: false })).rejects.toThrow(
      BranchInventoryRowMissingError
    );
    expect((tx as unknown as { branchInventory: { create: jest.Mock } }).branchInventory.create).not.toHaveBeenCalled();
    expect((tx as unknown as { inventoryMovement: { create: jest.Mock } }).inventoryMovement.create).not.toHaveBeenCalled();
  });

  it("no lanza cuando allowRowCreation=false pero la fila ya existe", async () => {
    const tx = makeTx([
      { quantity: new Prisma.Decimal(10), reorder_point: new Prisma.Decimal(0), last_low_stock_notified_at: null },
    ]);
    const result = await recordInventoryMovement(tx, { ...baseData, allowRowCreation: false });
    expect(result.balanceAfter).toBe(10);
    expect((tx as unknown as { branchInventory: { create: jest.Mock } }).branchInventory.create).not.toHaveBeenCalled();
  });
});
