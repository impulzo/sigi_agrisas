import { CODE_REGEX, normalizeProductCode } from "../normalize";
import { normalizeProductNameForMatching } from "../normalizeProductName";
import { TLAXIACO_PRODUCT_ALIASES } from "../../data/tlaxiacoProductAliases";
import { FALLBACK_DEPARTMENT_NAME, type BranchSeedPlan, type NormalizedSeedRow, type PrismaLike, type SeedContext } from "./types";

function toRate(raw: number): number {
  return Number((raw / 100).toFixed(4));
}

async function resolveByCode(
  prisma: PrismaLike,
  ctx: SeedContext,
  row: NormalizedSeedRow,
  plan: BranchSeedPlan
): Promise<{ id: string; code: string } | null> {
  const code = row.code;
  if (!code || !CODE_REGEX.test(code)) {
    ctx.counters.errors.push({ context: row.sourceRef, message: "code inválido" });
    return null;
  }

  const existing = await prisma.product.findUnique({ where: { code }, select: { id: true, name: true } });

  if (plan.productSync === "refresh") {
    // Matriz (INV AGRISAS): el `update` SIEMPRE pisa name/unit/departmentId/satProductCode/ivaRate/iepsRate (D8).
    const departmentId = await ctx.resolveDepartmentId(row.departmentName ?? FALLBACK_DEPARTMENT_NAME);
    const ivaRate = toRate(row.ivaRaw ?? 0);
    const iepsRate = toRate(row.iepsRaw ?? 0);
    const product = await prisma.product.upsert({
      where: { code },
      create: {
        code,
        name: row.name,
        unit: row.unit,
        departmentId,
        satProductCode: row.satCode,
        ivaRate,
        iepsRate,
        isTaxable: true,
        isActive: true,
      },
      update: { name: row.name, unit: row.unit, departmentId, satProductCode: row.satCode, ivaRate, iepsRate },
    });
    if (!existing) ctx.counters.productsCreated++;
    ctx.counters.matrizRefreshed++;
    return { id: product.id, code };
  }

  // productSync === "preserve" (tiendas de code alineado)
  if (existing) {
    if (existing.name !== row.name) ctx.counters.nameMismatch++;
    // Producto existente: NO se resuelve fallback aquí — sin `departmentName` en la
    // fila, el `departmentId` ya asignado permanece sin cambios (mismo criterio que
    // no pisar `name`).
    const departmentId = row.departmentName ? await ctx.resolveDepartmentId(row.departmentName) : null;
    const product = await prisma.product.upsert({
      where: { code },
      create: {
        code,
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
    return { id: product.id, code };
  }

  // Producto nuevo sin match: con departamento explícito, se resuelve normal;
  // sin departamento, usa el fallback compartido en vez de omitir la fila (historia 2).
  let departmentId: string;
  if (row.departmentName) {
    departmentId = await ctx.resolveDepartmentId(row.departmentName);
  } else {
    departmentId = await ctx.resolveDepartmentId(FALLBACK_DEPARTMENT_NAME);
    ctx.counters.branchFallbackDepartment++;
  }
  const product = await prisma.product.upsert({
    where: { code },
    create: {
      code,
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
  ctx.counters.productsCreated++;
  return { id: product.id, code };
}

async function resolveByName(
  prisma: PrismaLike,
  ctx: SeedContext,
  row: NormalizedSeedRow,
  nameIndex: Map<string, { id: string; code: string }>,
  syntheticCodeOwners: Map<string, string>
): Promise<{ id: string; code: string } | null> {
  const normalizedName = normalizeProductNameForMatching(row.name);
  let resolved = nameIndex.get(normalizedName);

  if (resolved) {
    ctx.counters.tlaxiacoMatched++;
    return resolved;
  }

  const aliasCode = TLAXIACO_PRODUCT_ALIASES[row.name];
  if (aliasCode) {
    const aliasProduct = await prisma.product.findUnique({ where: { code: aliasCode }, select: { id: true, name: true } });
    if (!aliasProduct) {
      ctx.counters.errors.push({
        context: row.sourceRef,
        message: `alias de producto "${row.name}" apunta a code inexistente "${aliasCode}"`,
      });
      return null;
    }
    resolved = { id: aliasProduct.id, code: aliasCode };
    nameIndex.set(normalizedName, resolved);
    ctx.counters.tlaxiacoAliased++;
    return resolved;
  }

  const usesFallbackDepartment = !row.departmentName;
  const syntheticCode = normalizeProductCode(row.name);
  if (!CODE_REGEX.test(syntheticCode)) {
    ctx.counters.errors.push({ context: row.sourceRef, message: `code sintetizado inválido para "${row.name}"` });
    return null;
  }
  const owner = syntheticCodeOwners.get(syntheticCode);
  if (owner && owner !== normalizedName) {
    ctx.counters.errors.push({
      context: row.sourceRef,
      message: `code sintetizado "${syntheticCode}" colisiona con producto de nombre distinto ya creado en esta corrida`,
    });
    return null;
  }
  syntheticCodeOwners.set(syntheticCode, normalizedName);

  const departmentId = await ctx.resolveDepartmentId(usesFallbackDepartment ? FALLBACK_DEPARTMENT_NAME : row.departmentName!);
  if (usesFallbackDepartment) ctx.counters.tlaxiacoFallbackDepartment++;
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
  ctx.counters.productsCreated++;
  ctx.counters.tlaxiacoCreated++;
  return resolved;
}

/**
 * Resuelve (match o auto-creación) el producto de una fila según `plan.productMatch`.
 * Devuelve `null` cuando la fila debe omitirse (código inválido, colisión de code
 * sintetizado) — el error ya fue registrado en `ctx.counters.errors`.
 */
export async function resolveAndUpsertProduct(
  prisma: PrismaLike,
  ctx: SeedContext,
  row: NormalizedSeedRow,
  plan: BranchSeedPlan,
  nameMatchState?: { nameIndex: Map<string, { id: string; code: string }>; syntheticCodeOwners: Map<string, string> }
): Promise<{ id: string; code: string } | null> {
  if (plan.productMatch === "name") {
    return resolveByName(prisma, ctx, row, nameMatchState!.nameIndex, nameMatchState!.syntheticCodeOwners);
  }
  return resolveByCode(prisma, ctx, row, plan);
}
