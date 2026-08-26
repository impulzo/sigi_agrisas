import {
  parseTiendaSheet,
  parseAgrisasSheet,
  parseTlaxiacoSheet,
  SHEET_CONFIGS,
} from "../../../../prisma/seeds/data/generate-inventario-tiendas-data";

// Fixtures extraídas literalmente de INVENTARIOS TIENDAS.xlsx (rango forzado a A1,
// columnas absolutas 0-based — ver nota de cabecera del generador).

describe("parseTiendaSheet (hojas de tienda simple)", () => {
  const zariozConfig = SHEET_CONFIGS["INV ZARIOZ "] as Extract<(typeof SHEET_CONFIGS)[string], { kind: "tienda" }>;

  it("fila de sección actualiza el departamento vigente y no se emite como producto", () => {
    const rows = [
      [null, null, null, "CODIGO ", "PRODUCTOS", "UNIDAD ", "CODIGO SAT", "PRECIO ", "IVA", "IEPS", null], // header, price no numérico → se omite
      [null, null, null, null, "INNOVAK", null, null, null, null, null, null], // sección
      [null, null, null, "AK1", "ALGAK 1L", "PZA", 10171500, 376, null, null, null],
    ];
    const { data, invalidCodes } = parseTiendaSheet(rows, zariozConfig);
    expect(invalidCodes).toBe(0);
    expect(data).toEqual([
      { code: "AK1", name: "ALGAK 1L", unit: "H87", satCode: "10171500", price: 376, departmentName: "INNOVAK", branchCode: "ZARIOZ" },
    ]);
  });

  it("fila vacía no aborta el parseo de la hoja", () => {
    const rows = [
      [null, null, null, null, null, null, null, null, null, null, null],
      [null, null, null, "AT1", "ATP UP 1L", "PZA", 10171500, 434, null, null, null],
    ];
    const { data } = parseTiendaSheet(rows, zariozConfig);
    expect(data).toHaveLength(1);
    expect(data[0].code).toBe("AT1");
  });

  it("Huajuapan (layout desplazado 1 columna) parsea con sus propios índices", () => {
    const huajuapanConfig = SHEET_CONFIGS["INV HUAJUAPAN "] as Extract<(typeof SHEET_CONFIGS)[string], { kind: "tienda" }>;
    const rows = [
      [null, null, null, "PRODUCTOS", null, null, null],
      [null, null, null, "INNOVAK", null, null, null],
      [null, null, "AK1", "ALGAK 1L", "PZA", 10171500, 376],
    ];
    const { data } = parseTiendaSheet(rows, huajuapanConfig);
    expect(data).toEqual([
      { code: "AK1", name: "ALGAK 1L", unit: "H87", satCode: "10171500", price: 376, departmentName: "INNOVAK", branchCode: "HUAJUAPAN" },
    ]);
  });

  it("code inválido se cuenta y se omite sin abortar", () => {
    const rows = [
      [null, null, null, "*", "PRODUCTO RARO", "PZA", 10171500, 100],
      [null, null, null, "AT1", "ATP UP 1L", "PZA", 10171500, 434],
    ];
    const { data, invalidCodes } = parseTiendaSheet(rows, zariozConfig);
    // "*" normaliza a code vacío tras strip → no matchea CODE_REGEX
    expect(invalidCodes).toBe(1);
    expect(data).toHaveLength(1);
    expect(data[0].code).toBe("AT1");
  });
});

describe("parseAgrisasSheet", () => {
  const agrisasConfig = SHEET_CONFIGS["INV AGRISAS "] as Extract<(typeof SHEET_CONFIGS)[string], { kind: "agrisas" }>;

  it("multi-tier de precio con Iva/Ieps propios, tier default siempre presente", () => {
    const rows = [
      ["Articulo", "DESCRIPCION ", "Unidad", "Existencia", "Codigo SAT", "Precio Adquisicion ", "PRECIO PUBLICO ", "PRECIO SUBDIS 10%", "PRECIO DISTRI 15%", "PRECIO 4", "SerLibres", "Iva", "Ieps", "NombreDepartamento"],
      ["EL AGRICULTOR ", null, null, null, null, null, null, null, null, null, null, null, null, null],
      ["ACTIVA1", "ACTIVANE 1KG", "PZA", 16, 10171600, 1312.62, 1562.64, 1426.76, 0, 0, 0, 0, 0, "AGRICULTOR"],
    ];
    const { data, invalidCodes, skipped } = parseAgrisasSheet(rows, agrisasConfig);
    expect(invalidCodes).toBe(0);
    expect(skipped).toBe(2); // header + fila "EL AGRICULTOR"
    expect(data).toEqual([
      {
        code: "ACTIVA1",
        name: "ACTIVANE 1KG",
        unit: "H87",
        satCode: "10171600",
        departmentName: "AGRICULTOR",
        ivaRaw: 0,
        iepsRaw: 0,
        existencia: 16,
        prices: [{ tierName: "Precio Publico", value: 1562.64, isDefault: true }, { tierName: "Precio Subdis 10%", value: 1426.76 }],
      },
    ]);
  });

  it("Iva/Ieps crudos tipo porcentaje entero se preservan sin dividir (división ocurre en el seeder runtime)", () => {
    const rows = [
      ["CHICE", "CHOICE1L", "PZA", 15, 12161900, null, 200, 0, 0, 0, 0, 16, 0, "AGRISTAR"],
    ];
    const { data } = parseAgrisasSheet(rows, agrisasConfig);
    expect(data[0].ivaRaw).toBe(16);
    expect(data[0].iepsRaw).toBe(0);
  });
});

describe("parseTlaxiacoSheet", () => {
  const tlaxiacoConfig = SHEET_CONFIGS["INV TLAXIACO "] as Extract<(typeof SHEET_CONFIGS)[string], { kind: "tlaxiaco" }>;

  it("normaliza precio string con símbolo de moneda y separador de miles", () => {
    const rows = [
      [7, "ADAPTADOR HEMBRA", "PZA", 10171500, "$18.00", "- Sin Departamento -"],
      [22, "ALIETTE DE 2KG", "PZA", 10171500, "$1,053.66", "- Sin Departamento -"],
    ];
    const { data } = parseTlaxiacoSheet(rows, tlaxiacoConfig);
    expect(data[0].price).toBe(18);
    expect(data[1].price).toBe(1053.66);
  });

  it("normaliza departamento vacío/placeholder a null y preserva código crudo sin usarlo como Product.code", () => {
    const rows = [
      [185, "KER KAB 1L", "PZA", 10171500, "$770.00", "KER"],
      [7, "ADAPTADOR HEMBRA", "PZA", 10171500, "$18.00", "- Sin Departamento -"],
    ];
    const { data } = parseTlaxiacoSheet(rows, tlaxiacoConfig);
    expect(data[0]).toEqual({
      tlaxiacoRawCode: 185,
      name: "KER KAB 1L",
      unit: "H87",
      satCode: "10171500",
      price: 770,
      departmentName: "KER",
      branchCode: "TLAXIACO",
    });
    expect(data[1].departmentName).toBeNull();
  });

  it("fila de header (P. Venta no numérico) se omite", () => {
    const rows = [
      ["CODIG0", "Producto", "UNIDAD ", "CODIGO SAT ", "P. Venta", "Departamento"],
      [7, "ADAPTADOR HEMBRA", "PZA", 10171500, "$18.00", "- Sin Departamento -"],
    ];
    const { data } = parseTlaxiacoSheet(rows, tlaxiacoConfig);
    expect(data).toHaveLength(1);
  });
});
