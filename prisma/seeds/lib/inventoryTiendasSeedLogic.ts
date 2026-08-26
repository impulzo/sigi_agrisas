import type { AgrisasRefreshRow, TiendaInventoryRow, TlaxiacoRawRow } from "../data/inventario-tiendas-v3";
import { CODE_REGEX, normalizeDepartmentCode, normalizeProductCode } from "./normalize";
import { normalizeProductNameForMatching } from "./normalizeProductName";

export interface PrismaLike {
  branch: {
    findUnique: (args: { where: { code: string }; select: { id: true } }) => Promise<{ id: string } | null>;
    upsert: (args: {
      where: { code: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  department: {
    upsert: (args: {
      where: { code: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  product: {
    findUnique: (args: {
      where: { code: string };
      select: { id: true; name: true };
    }) => Promise<{ id: string; name: string } | null>;
    findMany: (args: {
      select: { id: true; code: true; name: true };
    }) => Promise<Array<{ id: string; code: string; name: string }>>;
    upsert: (args: {
      where: { code: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  productPrice: {
    // Nota: NO usa `findUnique` por la clave compuesta `productId_branchId_name`
    // — en esta versión de Prisma, esa forma rechaza `branchId: null` en runtime
    // ("Argument branchId must not be null") aunque compile sin error. Mismo
    // motivo por el que `PrismaProductPriceRepository` (src/modules/products/)
    // usa `findFirst` para lookups con `branchId` nullable en vez de `findUnique`.
    findFirstBase: (args: {
      where: { productId: string; branchId: null; name: string };
      select: { id: true; price: true };
    }) => Promise<{ id: string; price: number } | null>;
    updateMany: (args: {
      where: { productId: string; branchId: string | null; isDefault: boolean };
      data: { isDefault: boolean };
    }) => Promise<{ count: number }>;
    /** Override branch-scoped (branchId real, no null) — la clave compuesta funciona sin problema aquí. */
    upsert: (args: {
      where: { productId_branchId_name: { productId: string; branchId: string; name: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
    /** Precio base (branchId: null) — usa findFirst+create/update internamente, nunca la clave compuesta con null. */
    upsertBase: (args: {
      where: { productId: string; branchId: null; name: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
  branchInventory: {
    upsert: (args: {
      where: { branchId_productId: { branchId: string; productId: string } };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<{ id: string }>;
  };
}

export interface TiendasSeedData {
  agrisas: AgrisasRefreshRow[];
  tiendas: TiendaInventoryRow[];
  tlaxiaco: TlaxiacoRawRow[];
}

export interface TiendasSeedError {
  context: string;
  message: string;
}

export interface TiendasSeedCounters {
  branchesCreated: number;
  productsCreated: number;
  nameMismatch: number;
  matrizRefreshed: number;
  tlaxiacoMatched: number;
  tlaxiacoCreated: number;
  tlaxiacoFallbackDepartment: number;
  priceOverridesByBranch: Record<string, number>;
  inventoryUpserted: number;
  errors: TiendasSeedError[];
}

const DEFAULT_PRICE_NAME = "Precio Publico";
const PRICE_TOLERANCE = 0.005;
const FALLBACK_DEPARTMENT_NAME = "Sin Departamento";

function toRate(raw: number): number {
  return Number((raw / 100).toFixed(4));
}

function emptyCounters(): TiendasSeedCounters {
  return {
    branchesCreated: 0,
    productsCreated: 0,
    nameMismatch: 0,
    matrizRefreshed: 0,
    tlaxiacoMatched: 0,
    tlaxiacoCreated: 0,
    tlaxiacoFallbackDepartment: 0,
    priceOverridesByBranch: {},
    inventoryUpserted: 0,
    errors: [],
  };
}

export async function seedInventoryTiendas(prisma: PrismaLike, data: TiendasSeedData): Promise<TiendasSeedCounters> {
  const counters = emptyCounters();

  const matriz = await prisma.branch.findUnique({ where: { code: "MATRIZ" }, select: { id: true } });
  if (!matriz) {
    counters.errors.push({ context: "MATRIZ", message: "Sucursal MATRIZ no encontrada en DB — no se puede refrescar Agrisas ni resolver el resto de sucursales" });
    return counters;
  }

  const departmentCache = new Map<string, string>(); // code normalizado → id
  async function resolveDepartmentId(name: string): Promise<string> {
    const code = normalizeDepartmentCode(name);
    const cached = departmentCache.get(code);
    if (cached) return cached;
    const dept = await prisma.department.upsert({
      where: { code },
      create: { code, name, isActive: true },
      update: {},
    });
    departmentCache.set(code, dept.id);
    return dept.id;
  }

  const branchCache = new Map<string, string>(); // branchCode → id
  branchCache.set("MATRIZ", matriz.id);
  async function resolveBranchId(branchCode: string): Promise<string> {
    const cached = branchCache.get(branchCode);
    if (cached) return cached;
    const existing = await prisma.branch.findUnique({ where: { code: branchCode }, select: { id: true } });
    if (existing) {
      branchCache.set(branchCode, existing.id);
      return existing.id;
    }
    const created = await prisma.branch.upsert({
      where: { code: branchCode },
      create: { code: branchCode, name: branchCode, isActive: true, isHeadquarters: false },
      update: {},
    });
    branchCache.set(branchCode, created.id);
    counters.branchesCreated++;
    return created.id;
  }

  async function upsertInventory(branchId: string, productId: string, quantity: number): Promise<void> {
    await prisma.branchInventory.upsert({
      where: { branchId_productId: { branchId, productId } },
      create: { branchId, productId, quantity, reservedQuantity: 0, reorderPoint: 0 },
      update: { quantity },
    });
    counters.inventoryUpserted++;
  }

  async function upsertBranchPriceIfDivergent(productId: string, branchId: string, branchCode: string, price: number): Promise<void> {
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

  // --- 1. Refresh de Matriz desde Agrisas (D8) — update agresivo, multi-tier ---
  for (const [i, row] of data.agrisas.entries()) {
    if (i % 50 === 0) console.log(`[seed:inventory-tiendas] AGRISAS ${i}/${data.agrisas.length}`);
    try {
      if (!CODE_REGEX.test(row.code)) {
        counters.errors.push({ context: `AGRISAS:${row.code}`, message: "code inválido" });
        continue;
      }
      const departmentId = await resolveDepartmentId(row.departmentName);
      const existing = await prisma.product.findUnique({ where: { code: row.code }, select: { id: true, name: true } });
      const product = await prisma.product.upsert({
        where: { code: row.code },
        create: {
          code: row.code,
          name: row.name,
          unit: row.unit,
          departmentId,
          satProductCode: row.satCode,
          ivaRate: toRate(row.ivaRaw),
          iepsRate: toRate(row.iepsRaw),
          isTaxable: true,
          isActive: true,
        },
        update: {
          name: row.name,
          unit: row.unit,
          departmentId,
          satProductCode: row.satCode,
          ivaRate: toRate(row.ivaRaw),
          iepsRate: toRate(row.iepsRaw),
        },
      });
      if (!existing) counters.productsCreated++;

      await prisma.productPrice.updateMany({
        where: { productId: product.id, branchId: null, isDefault: true },
        data: { isDefault: false },
      });
      for (const tier of row.prices) {
        await prisma.productPrice.upsertBase({
          where: { productId: product.id, branchId: null, name: tier.tierName },
          create: { productId: product.id, branchId: null, name: tier.tierName, price: tier.value, isDefault: !!tier.isDefault, minQuantity: 1 },
          update: { price: tier.value, isDefault: !!tier.isDefault },
        });
      }

      await upsertInventory(matriz.id, product.id, row.existencia);
      counters.matrizRefreshed++;
    } catch (err) {
      counters.errors.push({ context: `AGRISAS:${row.code}`, message: String(err) });
    }
  }

  // --- 2. 4 tiendas de code alineado (preserva name, historia 2/3/4) ---
  for (const [i, row] of data.tiendas.entries()) {
    if (i % 50 === 0) console.log(`[seed:inventory-tiendas] TIENDAS ${i}/${data.tiendas.length}`);
    try {
      if (!CODE_REGEX.test(row.code)) {
        counters.errors.push({ context: `${row.branchCode}:${row.code}`, message: "code inválido" });
        continue;
      }
      const branchId = await resolveBranchId(row.branchCode);
      const existing = await prisma.product.findUnique({ where: { code: row.code }, select: { id: true, name: true } });

      let productId: string;
      if (existing) {
        if (existing.name !== row.name) counters.nameMismatch++;
        // `create` no se ejecuta (el producto ya existe) — se completa sólo para satisfacer el contrato de upsert.
        const departmentId = row.departmentName ? await resolveDepartmentId(row.departmentName) : null;
        const product = await prisma.product.upsert({
          where: { code: row.code },
          create: {
            code: row.code,
            name: row.name,
            unit: row.unit,
            departmentId,
            satProductCode: row.satCode,
            ivaRate: 0,
            iepsRate: 0,
            isTaxable: true,
            isActive: true,
          },
          update: { unit: row.unit, satProductCode: row.satCode, ...(departmentId ? { departmentId } : {}) },
        });
        productId = product.id;
      } else {
        if (!row.departmentName) {
          counters.errors.push({ context: `${row.branchCode}:${row.code}`, message: "producto nuevo sin departamento resoluble — omitido" });
          continue;
        }
        const departmentId = await resolveDepartmentId(row.departmentName);
        const product = await prisma.product.upsert({
          where: { code: row.code },
          create: {
            code: row.code,
            name: row.name,
            unit: row.unit,
            departmentId,
            satProductCode: row.satCode,
            ivaRate: 0,
            iepsRate: 0,
            isTaxable: true,
            isActive: true,
          },
          update: {},
        });
        productId = product.id;
        counters.productsCreated++;
      }

      await upsertInventory(branchId, productId, 0); // sin columna de existencia en estas 4 hojas
      await upsertBranchPriceIfDivergent(productId, branchId, row.branchCode, row.price);
    } catch (err) {
      counters.errors.push({ context: `${row.branchCode}:${row.code}`, message: String(err) });
    }
  }

  // --- 3. Tlaxiaco: matching por nombre normalizado (D9, D10) ---
  const catalog = await prisma.product.findMany({ select: { id: true, code: true, name: true } });
  const nameIndex = new Map<string, { id: string; code: string }>();
  for (const p of catalog) {
    nameIndex.set(normalizeProductNameForMatching(p.name), { id: p.id, code: p.code });
  }
  const syntheticCodeOwners = new Map<string, string>(); // code sintetizado → normalizedName dueño

  let tlaxiacoBranchId: string | null = null;

  for (const [i, row] of data.tlaxiaco.entries()) {
    if (i % 25 === 0) console.log(`[seed:inventory-tiendas] TLAXIACO ${i}/${data.tlaxiaco.length}`);
    try {
      tlaxiacoBranchId ??= await resolveBranchId("TLAXIACO");
      const normalizedName = normalizeProductNameForMatching(row.name);
      let resolved = nameIndex.get(normalizedName);

      if (resolved) {
        counters.tlaxiacoMatched++;
      } else {
        const usesFallbackDepartment = !row.departmentName;
        const syntheticCode = normalizeProductCode(row.name);
        if (!CODE_REGEX.test(syntheticCode)) {
          counters.errors.push({ context: `TLAXIACO:${row.tlaxiacoRawCode}`, message: `code sintetizado inválido para "${row.name}"` });
          continue;
        }
        const owner = syntheticCodeOwners.get(syntheticCode);
        if (owner && owner !== normalizedName) {
          counters.errors.push({
            context: `TLAXIACO:${row.tlaxiacoRawCode}`,
            message: `code sintetizado "${syntheticCode}" colisiona con producto de nombre distinto ya creado en esta corrida`,
          });
          continue;
        }
        syntheticCodeOwners.set(syntheticCode, normalizedName);

        const departmentId = await resolveDepartmentId(usesFallbackDepartment ? FALLBACK_DEPARTMENT_NAME : row.departmentName!);
        if (usesFallbackDepartment) counters.tlaxiacoFallbackDepartment++;
        const product = await prisma.product.upsert({
          where: { code: syntheticCode },
          create: {
            code: syntheticCode,
            name: row.name,
            unit: row.unit,
            departmentId,
            satProductCode: row.satCode,
            ivaRate: 0,
            iepsRate: 0,
            isTaxable: true,
            isActive: true,
          },
          update: {},
        });
        resolved = { id: product.id, code: syntheticCode };
        nameIndex.set(normalizedName, resolved);
        counters.productsCreated++;
        counters.tlaxiacoCreated++;
      }

      await upsertInventory(tlaxiacoBranchId, resolved.id, 0); // sin columna de existencia en esta hoja
      await upsertBranchPriceIfDivergent(resolved.id, tlaxiacoBranchId, "TLAXIACO", row.price);
    } catch (err) {
      counters.errors.push({ context: `TLAXIACO:${row.tlaxiacoRawCode}`, message: String(err) });
    }
  }

  return counters;
}

export function printTiendasSeedReport(counters: TiendasSeedCounters): void {
  console.log("\n=== Resumen del seed de inventario multi-sucursal (v3) ===");
  console.log(`Sucursales creadas: ${counters.branchesCreated}`);
  console.log(`Productos creados: ${counters.productsCreated} | nameMismatch: ${counters.nameMismatch}`);
  console.log(`Matriz refrescada (Agrisas): ${counters.matrizRefreshed} productos`);
  console.log(`Tlaxiaco — matcheados por nombre: ${counters.tlaxiacoMatched} | auto-creados: ${counters.tlaxiacoCreated} | con departamento fallback: ${counters.tlaxiacoFallbackDepartment}`);
  console.log(`Inventario upserted: ${counters.inventoryUpserted}`);
  console.log("Overrides de precio por sucursal:");
  for (const [branch, count] of Object.entries(counters.priceOverridesByBranch)) {
    console.log(`  ${branch}: ${count}`);
  }
  if (counters.errors.length > 0) {
    console.log(`\nErrores (${counters.errors.length}):`);
    for (const e of counters.errors) {
      console.error(`  [${e.context}] ${e.message}`);
    }
  }
  console.log("============================================================");
}
