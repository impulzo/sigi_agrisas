import { buildBranchSeedPlans } from "../../../../../prisma/seeds/lib/inventory/plans";
import type { AgrisasRefreshRow, TiendaInventoryRow, TlaxiacoRawRow } from "../../../../../prisma/seeds/data/inventarioTiendasTypes";

function agrisasRow(overrides: Partial<AgrisasRefreshRow> = {}): AgrisasRefreshRow {
  return {
    code: "ACTIVA1",
    name: "ACTIVANE 1KG",
    unit: "H87",
    satCode: "10171600",
    departmentName: "AGRICULTOR",
    ivaRaw: 0,
    iepsRaw: 0,
    existencia: 16,
    prices: [{ tierName: "Precio Publico", value: 1562.64, isDefault: true }],
    ...overrides,
  };
}

function tiendaRow(overrides: Partial<TiendaInventoryRow> = {}): TiendaInventoryRow {
  return {
    code: "AK1",
    name: "ALGAK 1L",
    unit: "H87",
    satCode: "10171500",
    price: 376,
    departmentName: "INNOVAK",
    branchCode: "ZARIOZ",
    ...overrides,
  };
}

function tlaxiacoRow(overrides: Partial<TlaxiacoRawRow> = {}): TlaxiacoRawRow {
  return {
    tlaxiacoRawCode: 185,
    name: "KER KAB 1L",
    unit: "H87",
    satCode: "10171500",
    price: 770,
    departmentName: "KER",
    branchCode: "TLAXIACO",
    ...overrides,
  };
}

describe("buildBranchSeedPlans", () => {
  it("produce 6 planes en el orden fijo MATRIZ → CHICHICAPAM → HUAJUAPAN → PRADERA → ZARIOZ → TLAXIACO", () => {
    const plans = buildBranchSeedPlans({ agrisas: [], tiendas: [], tlaxiaco: [] });
    expect(plans.map((p) => p.branchCode)).toEqual(["MATRIZ", "CHICHICAPAM", "HUAJUAPAN", "PRADERA", "ZARIOZ", "TLAXIACO"]);
  });

  it("agrupa correctamente las 4 tiendas de TIENDAS_INVENTORY_DATA por branchCode", () => {
    const tiendas: TiendaInventoryRow[] = [
      tiendaRow({ code: "A1", branchCode: "ZARIOZ" }),
      tiendaRow({ code: "A2", branchCode: "CHICHICAPAM" }),
      tiendaRow({ code: "A3", branchCode: "ZARIOZ" }),
      tiendaRow({ code: "A4", branchCode: "HUAJUAPAN" }),
    ];
    const plans = buildBranchSeedPlans({ agrisas: [], tiendas, tlaxiaco: [] });
    const byBranch = Object.fromEntries(plans.map((p) => [p.branchCode, p]));

    expect(byBranch.ZARIOZ.rows.map((r) => r.code)).toEqual(["A1", "A3"]);
    expect(byBranch.CHICHICAPAM.rows.map((r) => r.code)).toEqual(["A2"]);
    expect(byBranch.HUAJUAPAN.rows.map((r) => r.code)).toEqual(["A4"]);
    expect(byBranch.PRADERA.rows).toHaveLength(0);
  });

  it("MATRIZ usa productSync 'refresh', priceMode 'base-tiers' y quantitySource 'row'", () => {
    const plans = buildBranchSeedPlans({ agrisas: [agrisasRow({ existencia: 42 })], tiendas: [], tlaxiaco: [] });
    const matriz = plans[0];
    expect(matriz.branchCode).toBe("MATRIZ");
    expect(matriz.productSync).toBe("refresh");
    expect(matriz.priceMode).toBe("base-tiers");
    expect(matriz.quantitySource).toBe("row");
    expect(matriz.rows[0].quantity).toBe(42);
  });

  it("tiendas usan productSync 'preserve', priceMode 'branch-override' y quantitySource 'zero'", () => {
    const plans = buildBranchSeedPlans({ agrisas: [], tiendas: [tiendaRow()], tlaxiaco: [] });
    const zarioz = plans.find((p) => p.branchCode === "ZARIOZ")!;
    expect(zarioz.productSync).toBe("preserve");
    expect(zarioz.priceMode).toBe("branch-override");
    expect(zarioz.quantitySource).toBe("zero");
  });

  it("TLAXIACO usa productMatch 'name' y code null en las filas normalizadas", () => {
    const plans = buildBranchSeedPlans({ agrisas: [], tiendas: [], tlaxiaco: [tlaxiacoRow()] });
    const tlaxiaco = plans[plans.length - 1];
    expect(tlaxiaco.branchCode).toBe("TLAXIACO");
    expect(tlaxiaco.productMatch).toBe("name");
    expect(tlaxiaco.rows[0].code).toBeNull();
  });

  it("tiendas y Tlaxiaco emiten un solo tier 'Precio Publico' desde row.price", () => {
    const plans = buildBranchSeedPlans({
      agrisas: [],
      tiendas: [tiendaRow({ price: 55 })],
      tlaxiaco: [tlaxiacoRow({ price: 99 })],
    });
    const zarioz = plans.find((p) => p.branchCode === "ZARIOZ")!;
    const tlaxiaco = plans.find((p) => p.branchCode === "TLAXIACO")!;
    expect(zarioz.rows[0].prices).toEqual([{ tierName: "Precio Publico", value: 55, isDefault: true }]);
    expect(tlaxiaco.rows[0].prices).toEqual([{ tierName: "Precio Publico", value: 99, isDefault: true }]);
  });
});
