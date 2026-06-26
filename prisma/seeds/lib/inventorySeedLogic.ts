import type { InventoryRow } from "../data/inventario-agrisas-v2";

export interface SeedCounters {
  products: { created: number; updated: number; skipped: number; errors: number };
  prices: { created: number; updated: number; errors: number };
  inventory: { created: number; updated: number; errors: number };
}

export interface SeedError {
  code: string;
  message: string;
}

export interface SeedResult {
  counters: SeedCounters;
  errors: SeedError[];
}

export interface SeedOptions {
  /** Sucursal destino para cargar `quantity` en BranchInventory. */
  branchId: string;
}

export interface PrismaLike {
  department: {
    findMany: (args: { select: { id: true; code: true } }) => Promise<Array<{ id: string; code: string }>>;
  };
  product: {
    findUnique: (args: { where: { code: string }; select: { id: true } }) => Promise<{ id: string } | null>;
    upsert: (args: {
      where: { code: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  productPrice: {
    findUnique: (args: { where: { productId_name: { productId: string; name: string } }; select: { id: true } }) => Promise<{ id: string } | null>;
    updateMany: (args: { where: { productId: string; isDefault: boolean }; data: { isDefault: boolean } }) => Promise<{ count: number }>;
    deleteMany: (args: { where: { productId: string; name: string } }) => Promise<{ count: number }>;
    upsert: (args: {
      where: { productId_name: { productId: string; name: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  branchInventory: {
    findUnique: (args: { where: { branchId_productId: { branchId: string; productId: string } }; select: { id: true } }) => Promise<{ id: string } | null>;
    upsert: (args: {
      where: { branchId_productId: { branchId: string; productId: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
}

function toRate(v: number | undefined | null): number {
  const n = v ?? 0;
  return Number.isFinite(n) ? n : 0;
}

/** Placeholder legacy creado por el seeder Excel viejo; se elimina al re-sembrar. */
const LEGACY_DEFAULT_PRICE_NAME = "Default";

export async function seedInventory(
  prisma: PrismaLike,
  rows: InventoryRow[],
  opts: SeedOptions
): Promise<SeedResult> {
  const counters: SeedCounters = {
    products: { created: 0, updated: 0, skipped: 0, errors: 0 },
    prices: { created: 0, updated: 0, errors: 0 },
    inventory: { created: 0, updated: 0, errors: 0 },
  };
  const errors: SeedError[] = [];

  // Build department map: code → id
  const depts = await prisma.department.findMany({ select: { id: true, code: true } });
  const deptMap = new Map(depts.map((d) => [d.code, d.id]));

  // Upserts idempotentes por producto. No se envuelve en $transaction: el set
  // completo es grande y los round-trips por producto exceden el timeout de
  // transacción interactiva de Prisma (5 s) sobre el pooler. El try/catch por
  // paso aísla fallos sin perder progreso (re-ejecutable).
  for (const row of rows) {
    const deptId = deptMap.get(row.departmentCode);
    if (!deptId) {
      counters.products.skipped++;
      console.log(`[seed:inventory] OMITIDO ${row.code}: departmentCode "${row.departmentCode}" no encontrado`);
      continue;
    }

    try {
      const existing = await prisma.product.findUnique({ where: { code: row.code }, select: { id: true } });

      const product = await prisma.product.upsert({
        where: { code: row.code },
        create: {
          code: row.code,
          name: row.name,
          unit: row.unit,
          departmentId: deptId,
          satProductCode: row.satProductCode ?? null,
          ivaRate: toRate(row.ivaRate),
          iepsRate: toRate(row.iepsRate),
          // isTaxable: el Excel no tiene columna equivalente; true es el default de negocio válido.
          isTaxable: row.isTaxable ?? true,
          isActive: true,
        },
        update: {
          name: row.name,
          unit: row.unit,
          departmentId: deptId,
          satProductCode: row.satProductCode ?? null,
          ivaRate: toRate(row.ivaRate),
          iepsRate: toRate(row.iepsRate),
          isTaxable: row.isTaxable ?? true,
          isActive: true,
        },
      });

      if (existing) {
        counters.products.updated++;
      } else {
        counters.products.created++;
      }

      // Enforce single default (product_default_price_idx) y limpia placeholder legacy
      await prisma.productPrice.updateMany({
        where: { productId: product.id, isDefault: true },
        data: { isDefault: false },
      });
      await prisma.productPrice.deleteMany({
        where: { productId: product.id, name: LEGACY_DEFAULT_PRICE_NAME },
      });

      // Upsert prices — validate single default desde el archivo
      let defaultSeen = false;
      for (const priceRow of row.prices) {
        let isDefault = priceRow.isDefault ?? false;
        if (isDefault && defaultSeen) {
          console.warn(`[seed:inventory] ${row.code}: precio "${priceRow.name}" marcado como default pero ya hay uno; se ignorará isDefault`);
          isDefault = false;
        }
        if (isDefault) defaultSeen = true;

        try {
          const existingPrice = await prisma.productPrice.findUnique({
            where: { productId_name: { productId: product.id, name: priceRow.name } },
            select: { id: true },
          });

          await prisma.productPrice.upsert({
            where: { productId_name: { productId: product.id, name: priceRow.name } },
            create: {
              productId: product.id,
              name: priceRow.name,
              price: priceRow.price,
              isDefault,
              minQuantity: 1,
              discountPct: null,
            },
            update: {
              price: priceRow.price,
              isDefault,
            },
          });

          if (existingPrice) {
            counters.prices.updated++;
          } else {
            counters.prices.created++;
          }
        } catch (priceErr) {
          counters.prices.errors++;
          errors.push({ code: row.code, message: `precio "${priceRow.name}": ${String(priceErr)}` });
        }
      }

      // Upsert inventario en la sucursal destino
      try {
        const existingInv = await prisma.branchInventory.findUnique({
          where: { branchId_productId: { branchId: opts.branchId, productId: product.id } },
          select: { id: true },
        });
        await prisma.branchInventory.upsert({
          where: { branchId_productId: { branchId: opts.branchId, productId: product.id } },
          create: {
            branchId: opts.branchId,
            productId: product.id,
            quantity: row.quantity ?? 0,
            reservedQuantity: 0,
            reorderPoint: 0,
          },
          update: {
            quantity: row.quantity ?? 0,
          },
        });
        if (existingInv) {
          counters.inventory.updated++;
        } else {
          counters.inventory.created++;
        }
      } catch (invErr) {
        counters.inventory.errors++;
        errors.push({ code: row.code, message: `inventario: ${String(invErr)}` });
      }
    } catch (productErr) {
      counters.products.errors++;
      errors.push({ code: row.code, message: String(productErr) });
    }
  }

  return { counters, errors };
}

export function printSeedReport(result: SeedResult): void {
  const { counters, errors } = result;
  console.log("\n=== Resumen del seed de inventario (v2) ===");
  console.log(
    `Productos  — Creados: ${counters.products.created} | Actualizados: ${counters.products.updated} | Omitidos: ${counters.products.skipped} | Errores: ${counters.products.errors}`
  );
  console.log(
    `Precios    — Creados: ${counters.prices.created} | Actualizados: ${counters.prices.updated} | Errores: ${counters.prices.errors}`
  );
  console.log(
    `Inventario — Creados: ${counters.inventory.created} | Actualizados: ${counters.inventory.updated} | Errores: ${counters.inventory.errors}`
  );
  if (errors.length > 0) {
    console.log("\nDetalle de errores:");
    for (const e of errors) {
      console.error(`  [${e.code}] ${e.message}`);
    }
  }
  console.log("===========================================");
}
