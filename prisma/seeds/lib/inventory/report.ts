import type { OrphanProductsSummary, PrismaLike, TiendasSeedCounters } from "./types";

/**
 * Validación de solo lectura: productos activos sin ninguna fila de `branch_inventory`
 * en ninguna sucursal — precondición de `INVENTORY_SCOPE_MODE=branch` (donde la fila de
 * inventario tiene doble semántica: cantidad y asignación). No crea ni modifica nada.
 */
export async function detectOrphanProducts(prisma: PrismaLike): Promise<OrphanProductsSummary> {
  const activeProducts = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true } });
  const assignedProductIds = new Set(
    (await prisma.branchInventory.findMany({ select: { productId: true } })).map((row) => row.productId)
  );
  const orphans = activeProducts.filter((p) => !assignedProductIds.has(p.id));
  return { count: orphans.length, sampleCodes: orphans.slice(0, 20).map((p) => p.code) };
}

export function printTiendasSeedReport(counters: TiendasSeedCounters): void {
  console.log("\n=== Resumen del seed de inventario multi-sucursal (v3) ===");
  console.log(`Sucursales creadas: ${counters.branchesCreated}`);
  console.log(
    `Productos creados: ${counters.productsCreated} | nameMismatch: ${counters.nameMismatch} | branchFallbackDepartment: ${counters.branchFallbackDepartment}`
  );
  console.log(`Matriz refrescada (Agrisas): ${counters.matrizRefreshed} productos`);
  console.log(
    `Tlaxiaco — matcheados por nombre: ${counters.tlaxiacoMatched} | alias explícito: ${counters.tlaxiacoAliased} | auto-creados: ${counters.tlaxiacoCreated} | con departamento fallback: ${counters.tlaxiacoFallbackDepartment}`
  );
  console.log(`Inventario upserted: ${counters.inventoryUpserted}`);
  console.log(`Filas con precio vacío/0 (no se escribió ProductPrice): ${counters.emptyPriceRows}`);
  console.log("Overrides de precio por sucursal:");
  for (const [branch, count] of Object.entries(counters.priceOverridesByBranch)) {
    console.log(`  ${branch}: ${count}`);
  }
  console.log(`Productos huérfanos (activos sin fila de branch_inventory en ninguna sucursal): ${counters.orphanProducts.count}`);
  if (counters.orphanProducts.count > 0) {
    console.log(`  Ejemplos: ${counters.orphanProducts.sampleCodes.join(", ")}`);
  }
  if (counters.errors.length > 0) {
    console.log(`\nErrores (${counters.errors.length}):`);
    for (const e of counters.errors) {
      console.error(`  [${e.context}] ${e.message}`);
    }
  }
  console.log("============================================================");
}
