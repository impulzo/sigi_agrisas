/**
 * Generador dev-only: lee `INVENTARIOS TIENDAS.xlsx` (6 hojas: Matriz +
 * 4 tiendas de code alineado al catálogo + Tlaxiaco de code numérico propio)
 * y escribe `inventario-tiendas-v3.ts` con los datos embebidos.
 *
 * Re-ejecutar SOLO cuando cambie el Excel:
 *   npx ts-node --project prisma/seeds/tsconfig.json prisma/seeds/data/generate-inventario-tiendas-data.ts
 *
 * El seeder de runtime (`inventory-tiendas.ts`) NO usa este archivo ni el
 * Excel; consume el TS generado.
 *
 * Nota de implementación: el rango usado (`sheet['!ref']`) de varias hojas
 * NO arranca en A1 (ej. Zarioz es `C2:K513`, Pradera `B2:L394`). Por default
 * `XLSX.utils.sheet_to_json(sheet, {header:1})` devuelve arrays RELATIVOS a
 * ese rango — no a la columna A absoluta — lo cual desalinea cualquier
 * índice de columna fijo. Se fuerza el rango a iniciar en fila/columna 0
 * (`readSheetRowsAbsolute`) para que los índices de `SHEET_CONFIGS` sean
 * siempre absolutos y consistentes entre hojas.
 */
import path from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { CODE_REGEX, isBlank, normalizeProductCode } from "../lib/normalize";
import { mapUnitCode } from "../lib/unitCodeMap";
import type { AgrisasRefreshRow, TiendaInventoryRow, TlaxiacoRawRow } from "./inventarioTiendasTypes";

const EXCEL_PATH = path.resolve(__dirname, "INVENTARIOS TIENDAS.xlsx");
const OUT_PATH = path.resolve(__dirname, "inventario-tiendas-v3.ts");

type ExcelRow = unknown[];

interface TiendaColumns {
  code: number;
  name: number;
  unit: number;
  satCode: number;
  price: number;
}

interface TiendaSheetConfig {
  kind: "tienda";
  branchCode: string;
  columns: TiendaColumns;
}

interface AgrisasSheetConfig {
  kind: "agrisas";
  columns: {
    code: number;
    name: number;
    unit: number;
    existencia: number;
    satCode: number;
    iva: number;
    ieps: number;
    department: number;
  };
  priceColumns: Array<{ col: number; tierName: string; isDefault?: boolean }>;
}

interface TlaxiacoSheetConfig {
  kind: "tlaxiaco";
  branchCode: "TLAXIACO";
  columns: {
    rawCode: number;
    name: number;
    unit: number;
    satCode: number;
    price: number;
    department: number;
  };
}

type SheetConfig = TiendaSheetConfig | AgrisasSheetConfig | TlaxiacoSheetConfig;

// Índices de columna 0-based, verificados por inspección directa del Excel
// real (ver design.md — Context). Nombres de hoja incluyen el espacio final
// real (confirmado con `wb.SheetNames`).
const SHEET_CONFIGS: Record<string, SheetConfig> = {
  "INV AGRISAS ": {
    kind: "agrisas",
    columns: { code: 0, name: 1, unit: 2, existencia: 3, satCode: 4, iva: 11, ieps: 12, department: 13 },
    priceColumns: [
      { col: 6, tierName: "Precio Publico", isDefault: true },
      { col: 7, tierName: "Precio Subdis 10%" },
      { col: 8, tierName: "Precio Distri 15%" },
      { col: 9, tierName: "Precio 4" },
    ],
  },
  "INV CHICHICAPAM ": {
    kind: "tienda",
    branchCode: "CHICHICAPAM",
    columns: { code: 3, name: 4, unit: 5, satCode: 6, price: 7 },
  },
  "INV TLAXIACO ": {
    kind: "tlaxiaco",
    branchCode: "TLAXIACO",
    columns: { rawCode: 0, name: 1, unit: 2, satCode: 3, price: 4, department: 5 },
  },
  "INV ZARIOZ ": {
    kind: "tienda",
    branchCode: "ZARIOZ",
    columns: { code: 3, name: 4, unit: 5, satCode: 6, price: 7 },
  },
  "INV HUAJUAPAN ": {
    kind: "tienda",
    branchCode: "HUAJUAPAN",
    // Desplazada 1 columna a la izquierda respecto a Zarioz/Chichicapam/Pradera.
    columns: { code: 2, name: 3, unit: 4, satCode: 5, price: 6 },
  },
  "INV PRADERA ": {
    kind: "tienda",
    branchCode: "PRADERA",
    columns: { code: 2, name: 3, unit: 4, satCode: 5, price: 6 },
  },
};

function toFiniteNumber(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Precio de Tlaxiaco viene como string `"$18.00"` / `"$1,053.66"`. */
function parseTlaxiacoPrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  const cleaned = String(raw).replace(/[$,]/g, "").trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function resolveSatCode(raw: unknown): string | null {
  return !isBlank(raw) && /^\d{8}$/.test(String(raw)) ? String(raw) : null;
}

function readSheetRowsAbsolute(wb: XLSX.WorkBook, sheetName: string): ExcelRow[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    console.error(`Error: hoja "${sheetName}" no encontrada en el workbook.`);
    process.exit(1);
  }
  const ref = sheet["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  // Fuerza el rango a iniciar en A1 (fila/columna 0) — ver nota de cabecera.
  const forced = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: range.e });
  return XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 1, defval: null, raw: true, range: forced });
}

function maxColumnIndex(config: SheetConfig): number {
  if (config.kind === "tienda") {
    return Math.max(...Object.values(config.columns));
  }
  if (config.kind === "agrisas") {
    const cols = Object.values(config.columns);
    const priceCols = config.priceColumns.map((p) => p.col);
    return Math.max(...cols, ...priceCols);
  }
  return Math.max(...Object.values(config.columns));
}

function parseTiendaSheet(rows: ExcelRow[], config: TiendaSheetConfig): { data: TiendaInventoryRow[]; invalidCodes: number } {
  const data: TiendaInventoryRow[] = [];
  let currentDept: string | null = null;
  let invalidCodes = 0;

  for (const row of rows) {
    const codeRaw = row[config.columns.code];
    const nameRaw = row[config.columns.name];
    const unitRaw = row[config.columns.unit];

    if (isBlank(codeRaw) && isBlank(unitRaw)) {
      if (!isBlank(nameRaw)) currentDept = String(nameRaw).trim();
      continue;
    }
    if (isBlank(codeRaw)) continue; // sin code no hay producto posible
    if (isBlank(nameRaw) || isBlank(unitRaw)) continue; // fila incompleta

    const price = toFiniteNumber(row[config.columns.price]);
    if (price === null) continue; // fila de header/label (ej. "PRECIO ") u otra no-numérica

    const code = normalizeProductCode(String(codeRaw));
    if (!CODE_REGEX.test(code)) {
      invalidCodes++;
      console.warn(`[${config.branchCode}] code inválido "${codeRaw}" → "${code}", omitido`);
      continue;
    }

    data.push({
      code,
      name: String(nameRaw).trim(),
      unit: mapUnitCode(unitRaw),
      satCode: resolveSatCode(row[config.columns.satCode]),
      price,
      departmentName: currentDept,
      branchCode: config.branchCode,
    });
  }

  return { data, invalidCodes };
}

function parseAgrisasSheet(rows: ExcelRow[], config: AgrisasSheetConfig): { data: AgrisasRefreshRow[]; invalidCodes: number; skipped: number } {
  const data: AgrisasRefreshRow[] = [];
  let invalidCodes = 0;
  let skipped = 0;

  for (const row of rows) {
    const codeRaw = row[config.columns.code];
    const nameRaw = row[config.columns.name];
    const deptRaw = row[config.columns.department];
    if (isBlank(codeRaw) || isBlank(nameRaw) || isBlank(deptRaw)) {
      skipped++;
      continue;
    }

    const defaultTier = config.priceColumns.find((p) => p.isDefault);
    const defaultValue = defaultTier ? toFiniteNumber(row[defaultTier.col]) : null;
    if (defaultValue === null) {
      // Fila de header ("PRECIO PUBLICO ") u otra fila degenerada.
      skipped++;
      continue;
    }

    const code = normalizeProductCode(String(codeRaw));
    if (!CODE_REGEX.test(code)) {
      invalidCodes++;
      console.warn(`[AGRISAS] code inválido "${codeRaw}" → "${code}", omitido`);
      continue;
    }

    const prices: AgrisasRefreshRow["prices"] = [];
    for (const tier of config.priceColumns) {
      const value = toFiniteNumber(row[tier.col]) ?? 0;
      if (tier.isDefault) {
        prices.push({ tierName: tier.tierName, value, isDefault: true });
      } else if (value > 0) {
        prices.push({ tierName: tier.tierName, value });
      }
    }

    data.push({
      code,
      name: String(nameRaw).trim(),
      unit: mapUnitCode(row[config.columns.unit]),
      satCode: resolveSatCode(row[config.columns.satCode]),
      departmentName: String(deptRaw).trim(),
      ivaRaw: toFiniteNumber(row[config.columns.iva]) ?? 0,
      iepsRaw: toFiniteNumber(row[config.columns.ieps]) ?? 0,
      existencia: toFiniteNumber(row[config.columns.existencia]) ?? 0,
      prices,
    });
  }

  return { data, invalidCodes, skipped };
}

const SIN_DEPARTAMENTO_PLACEHOLDER = "- Sin Departamento -";

function parseTlaxiacoSheet(rows: ExcelRow[], config: TlaxiacoSheetConfig): { data: TlaxiacoRawRow[] } {
  const data: TlaxiacoRawRow[] = [];

  for (const row of rows) {
    const rawCode = row[config.columns.rawCode];
    const nameRaw = row[config.columns.name];
    const unitRaw = row[config.columns.unit];
    if (isBlank(rawCode) || isBlank(nameRaw) || isBlank(unitRaw)) continue;

    const price = parseTlaxiacoPrice(row[config.columns.price]);
    if (price === null) continue; // fila de header ("P. Venta") u otra no-numérica

    const deptRaw = row[config.columns.department];
    const deptTrimmed = isBlank(deptRaw) ? null : String(deptRaw).trim();
    const departmentName = deptTrimmed === null || deptTrimmed === SIN_DEPARTAMENTO_PLACEHOLDER ? null : deptTrimmed;

    data.push({
      tlaxiacoRawCode: rawCode as number | string,
      name: String(nameRaw).trim(),
      unit: mapUnitCode(unitRaw),
      satCode: resolveSatCode(row[config.columns.satCode]),
      price,
      departmentName,
      branchCode: "TLAXIACO",
    });
  }

  return { data };
}

function main(): void {
  if (!existsSync(EXCEL_PATH)) {
    console.error(`Error: Excel no encontrado en ${EXCEL_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_PATH);

  let agrisasData: AgrisasRefreshRow[] = [];
  let tiendasData: TiendaInventoryRow[] = [];
  let tlaxiacoData: TlaxiacoRawRow[] = [];
  let totalInvalidCodes = 0;
  let totalSkipped = 0;

  for (const [sheetName, config] of Object.entries(SHEET_CONFIGS)) {
    const rows = readSheetRowsAbsolute(wb, sheetName);
    if (rows.length === 0) {
      console.error(`Error: hoja "${sheetName}" sin filas.`);
      process.exit(1);
    }

    const range = XLSX.utils.decode_range(wb.Sheets[sheetName]["!ref"] as string);
    if (range.e.c < maxColumnIndex(config)) {
      console.error(
        `Error: hoja "${sheetName}" no tiene el número de columnas mínimo esperado (llega a col ${range.e.c}, se requiere ${maxColumnIndex(config)}).`
      );
      process.exit(1);
    }

    if (config.kind === "tienda") {
      const { data, invalidCodes } = parseTiendaSheet(rows, config);
      tiendasData = tiendasData.concat(data);
      totalInvalidCodes += invalidCodes;
      console.log(`[${sheetName.trim()}] productos: ${data.length} | codes inválidos: ${invalidCodes}`);
    } else if (config.kind === "agrisas") {
      const { data, invalidCodes, skipped } = parseAgrisasSheet(rows, config);
      agrisasData = data;
      totalInvalidCodes += invalidCodes;
      totalSkipped += skipped;
      console.log(`[AGRISAS] productos: ${data.length} | codes inválidos: ${invalidCodes} | omitidos: ${skipped}`);
    } else {
      const { data } = parseTlaxiacoSheet(rows, config);
      tlaxiacoData = data;
      console.log(`[TLAXIACO] productos: ${data.length}`);
    }
  }

  const content = `// AUTO-GENERADO por prisma/seeds/data/generate-inventario-tiendas-data.ts — NO editar a mano.
// Fuente: INVENTARIOS TIENDAS.xlsx. Regenerar con:
//   npx ts-node --project prisma/seeds/tsconfig.json prisma/seeds/data/generate-inventario-tiendas-data.ts

import type { AgrisasRefreshRow, TiendaInventoryRow, TlaxiacoRawRow } from "./inventarioTiendasTypes";

export const AGRISAS_REFRESH_DATA: AgrisasRefreshRow[] = ${JSON.stringify(agrisasData, null, 2)};

export const TIENDAS_INVENTORY_DATA: TiendaInventoryRow[] = ${JSON.stringify(tiendasData, null, 2)};

export const TLAXIACO_RAW_DATA: TlaxiacoRawRow[] = ${JSON.stringify(tlaxiacoData, null, 2)};
`;

  writeFileSync(OUT_PATH, content, "utf8");

  console.log(`\n[generate-inventario-tiendas-data] Escrito: ${OUT_PATH}`);
  console.log(
    `  Agrisas: ${agrisasData.length} | Tiendas: ${tiendasData.length} | Tlaxiaco: ${tlaxiacoData.length} | Codes inválidos: ${totalInvalidCodes} | Omitidos: ${totalSkipped}`
  );
}

if (require.main === module) {
  main();
}

export { parseTiendaSheet, parseAgrisasSheet, parseTlaxiacoSheet, SHEET_CONFIGS };
