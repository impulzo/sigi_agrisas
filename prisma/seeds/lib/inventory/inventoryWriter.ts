import type { PrismaLike, TiendasSeedCounters } from "./types";

export async function upsertInventory(
  prisma: PrismaLike,
  counters: TiendasSeedCounters,
  branchId: string,
  productId: string,
  quantity: number
): Promise<void> {
  await prisma.branchInventory.upsert({
    where: { branchId_productId: { branchId, productId } },
    create: { branchId, productId, quantity, reservedQuantity: 0, reorderPoint: 0 },
    update: { quantity },
  });
  counters.inventoryUpserted++;
}
