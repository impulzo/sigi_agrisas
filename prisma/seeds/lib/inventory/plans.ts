import type { AgrisasRefreshRow, TiendaInventoryRow, TlaxiacoRawRow } from "../../data/inventarioTiendasTypes";
import type { BranchSeedPlan, NormalizedSeedRow, TiendasSeedData } from "./types";

/** Orden fijo entre las 4 tiendas de code alineado — no afecta comportamiento, sólo reproducibilidad del log. */
const TIENDA_BRANCH_ORDER = ["CHICHICAPAM", "HUAJUAPAN", "PRADERA", "ZARIOZ"];

function agrisasToRow(row: AgrisasRefreshRow): NormalizedSeedRow {
  return {
    sourceRef: `AGRISAS:${row.code}`,
    code: row.code,
    name: row.name,
    unit: row.unit,
    satCode: row.satCode,
    departmentName: row.departmentName,
    ivaRaw: row.ivaRaw,
    iepsRaw: row.iepsRaw,
    quantity: row.existencia,
    prices: row.prices,
  };
}

function tiendaToRow(row: TiendaInventoryRow): NormalizedSeedRow {
  return {
    sourceRef: `${row.branchCode}:${row.code}`,
    code: row.code,
    name: row.name,
    unit: row.unit,
    satCode: row.satCode,
    departmentName: row.departmentName,
    ivaRaw: null,
    iepsRaw: null,
    quantity: null,
    prices: [{ tierName: "Precio Publico", value: row.price, isDefault: true }],
  };
}

function tlaxiacoToRow(row: TlaxiacoRawRow): NormalizedSeedRow {
  return {
    sourceRef: `TLAXIACO:${row.tlaxiacoRawCode}`,
    code: null,
    name: row.name,
    unit: row.unit,
    satCode: row.satCode,
    departmentName: row.departmentName,
    ivaRaw: null,
    iepsRaw: null,
    quantity: null,
    prices: [{ tierName: "Precio Publico", value: row.price, isDefault: true }],
  };
}

/**
 * Construye los 6 planes de sucursal en orden fijo y determinístico:
 * MATRIZ (refresh) → 4 tiendas de code alineado → TLAXIACO (matching por nombre, al final
 * para maximizar cobertura del índice de nombres construido en `getNameIndex`).
 */
export function buildBranchSeedPlans(data: TiendasSeedData): BranchSeedPlan[] {
  const plans: BranchSeedPlan[] = [
    {
      branchCode: "MATRIZ",
      rows: data.agrisas.map(agrisasToRow),
      productMatch: "code",
      productSync: "refresh",
      priceMode: "base-tiers",
      quantitySource: "row",
      createBranchIfMissing: false,
    },
  ];

  for (const branchCode of TIENDA_BRANCH_ORDER) {
    plans.push({
      branchCode,
      rows: data.tiendas.filter((row) => row.branchCode === branchCode).map(tiendaToRow),
      productMatch: "code",
      productSync: "preserve",
      priceMode: "branch-override",
      quantitySource: "zero",
      createBranchIfMissing: true,
    });
  }

  plans.push({
    branchCode: "TLAXIACO",
    rows: data.tlaxiaco.map(tlaxiacoToRow),
    productMatch: "name",
    productSync: "preserve",
    priceMode: "branch-override",
    quantitySource: "zero",
    createBranchIfMissing: true,
  });

  return plans;
}
