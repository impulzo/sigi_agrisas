import type { PrismaLike, TiendasSeedCounters } from "./types";

const DEFAULT_PRICE_NAME = "Precio Publico";
const PRICE_TOLERANCE = 0.005;

/** Sincroniza todos los tiers de precio base (`branchId: null`) de Matriz — desmarca el default previo primero. */
export async function writeBasePriceTiers(
  prisma: PrismaLike,
  productId: string,
  tiers: Array<{ tierName: string; value: number; isDefault?: boolean }>
): Promise<void> {
  await prisma.productPrice.updateMany({
    where: { productId, branchId: null, isDefault: true },
    data: { isDefault: false },
  });
  for (const tier of tiers) {
    await prisma.productPrice.upsertBase({
      where: { productId, branchId: null, name: tier.tierName },
      create: { productId, branchId: null, name: tier.tierName, price: tier.value, isDefault: !!tier.isDefault, minQuantity: 1 },
      update: { price: tier.value, isDefault: !!tier.isDefault },
    });
  }
}

/** Precio branch-scoped condicional: no crea override si coincide con el base dentro de tolerancia. */
export async function writeBranchPriceIfDivergent(
  prisma: PrismaLike,
  counters: TiendasSeedCounters,
  productId: string,
  branchId: string,
  branchCode: string,
  price: number
): Promise<void> {
  const base = await prisma.productPrice.findFirstBase({
    where: { productId, branchId: null, name: DEFAULT_PRICE_NAME },
    select: { id: true, price: true },
  });
  if (base && Math.abs(base.price - price) < PRICE_TOLERANCE) return; // hereda el base, no crea override

  await prisma.productPrice.upsert({
    where: { productId_branchId_name: { productId, branchId, name: DEFAULT_PRICE_NAME } },
    create: { productId, branchId, name: DEFAULT_PRICE_NAME, price, isDefault: true, minQuantity: 1 },
    update: { price, isDefault: true },
  });
  counters.priceOverridesByBranch[branchCode] = (counters.priceOverridesByBranch[branchCode] ?? 0) + 1;
}
