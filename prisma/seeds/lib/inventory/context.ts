import { normalizeDepartmentCode } from "../normalize";
import { normalizeProductNameForMatching } from "../normalizeProductName";
import { DEPARTMENT_ALIASES } from "../../data/departmentAliases";
import { emptyCounters, type PrismaLike, type SeedContext } from "./types";

/**
 * Precondición: `MATRIZ` debe existir ya en DB (sembrada por `npm run seed`).
 * Si no existe, devuelve un contexto con `matrizFound: false` y el error ya
 * cargado en `counters` — el caller (`seedInventoryTiendas`) debe retornar
 * temprano sin procesar ningún plan.
 */
export async function createSeedContext(prisma: PrismaLike): Promise<SeedContext> {
  const counters = emptyCounters();

  const matriz = await prisma.branch.findUnique({ where: { code: "MATRIZ" }, select: { id: true } });
  if (!matriz) {
    counters.errors.push({
      context: "MATRIZ",
      message: "Sucursal MATRIZ no encontrada en DB — no se puede refrescar Agrisas ni resolver el resto de sucursales",
    });
    return {
      counters,
      matrizFound: false,
      resolveDepartmentId: async () => {
        throw new Error("createSeedContext: MATRIZ no encontrada, no debería llamarse resolveDepartmentId");
      },
      resolveBranchId: async () => {
        throw new Error("createSeedContext: MATRIZ no encontrada, no debería llamarse resolveBranchId");
      },
      getNameIndex: async () => new Map(),
    };
  }

  const departmentCache = new Map<string, string>(); // code normalizado → id
  async function resolveDepartmentId(name: string): Promise<string> {
    const canonicalName = DEPARTMENT_ALIASES[name] ?? name;
    const code = normalizeDepartmentCode(canonicalName);
    const cached = departmentCache.get(code);
    if (cached) return cached;
    const dept = await prisma.department.upsert({
      where: { code },
      create: { code, name: canonicalName, isActive: true },
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

  let nameIndexPromise: Promise<Map<string, { id: string; code: string }>> | null = null;
  function getNameIndex(): Promise<Map<string, { id: string; code: string }>> {
    if (!nameIndexPromise) {
      nameIndexPromise = (async () => {
        const catalog = await prisma.product.findMany({ select: { id: true, code: true, name: true } });
        const index = new Map<string, { id: string; code: string }>();
        for (const p of catalog) {
          index.set(normalizeProductNameForMatching(p.name), { id: p.id, code: p.code });
        }
        return index;
      })();
    }
    return nameIndexPromise;
  }

  return { counters, matrizFound: true, resolveDepartmentId, resolveBranchId, getNameIndex };
}
