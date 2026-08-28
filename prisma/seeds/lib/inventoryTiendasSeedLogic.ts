/**
 * Fachada del seeder de inventario multi-sucursal. La lógica vive en
 * `./inventory/*` (motor por plan, D1 del design.md de
 * `restructure-inventory-seeder-by-branch`) — este archivo conserva la firma
 * pública exacta (`seedInventoryTiendas`, `printTiendasSeedReport`, tipos)
 * para no romper `inventory-tiendas.ts` ni los tests existentes.
 */
import { createSeedContext } from "./inventory/context";
import { buildBranchSeedPlans } from "./inventory/plans";
import { detectOrphanProducts, printTiendasSeedReport } from "./inventory/report";
import { seedBranch } from "./inventory/seedBranch";
import type { PrismaLike, TiendasSeedCounters, TiendasSeedData, TiendasSeedError } from "./inventory/types";

export type { PrismaLike, TiendasSeedCounters, TiendasSeedData, TiendasSeedError };
export { printTiendasSeedReport };

export async function seedInventoryTiendas(prisma: PrismaLike, data: TiendasSeedData): Promise<TiendasSeedCounters> {
  const ctx = await createSeedContext(prisma);
  if (!ctx.matrizFound) return ctx.counters;

  for (const plan of buildBranchSeedPlans(data)) {
    await seedBranch(prisma, plan, ctx);
  }

  ctx.counters.orphanProducts = await detectOrphanProducts(prisma);
  return ctx.counters;
}
