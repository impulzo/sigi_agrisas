/**
 * Generador dev-only: lee `INVENTARIO AGRISAS 2.0.xlsx` y reescribe
 * `inventario-agrisas-v2.ts` con TODOS los datos embebidos (productos, precios
 * multi-tier, satProductCode, existencia, departamentos).
 *
 * Re-ejecutar SOLO cuando cambie el Excel:
 *   npx ts-node --project prisma/seeds/tsconfig.json prisma/seeds/data/generate-inventory-data.ts
 *
 * El seeder de runtime (`inventory.ts`) NO usa este archivo ni el Excel; consume
 * el TS generado. Así el Excel no es necesario para sembrar.
 */
import path from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import * as XLSX from "xlsx";
import {
  CODE_REGEX,
  isBlank,
  normalizeDepartmentCode,
  normalizeProductCode,
} from "../lib/normalize";

const ROOT = path.resolve(__dirname, "..", "..", "..");
const EXCEL_PATH = path.resolve(ROOT, "INVENTARIO AGRISAS 2.0.xlsx");
const OUT_PATH = path.resolve(__dirname, "inventario-agrisas-v2.ts");
const SHEET_NAME = "Hoja1";

type ExcelRow = Record<string, unknown>;

/** Convierte un header de precio del Excel a un nombre de tier legible (≤60). */
function priceTierName(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ")
    .slice(0, 60);
}

function toRate(value: unknown): number {
  const n = value == null ? 0 : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Number((n / 100).toFixed(4));
}

function toNumberOrZero(value: unknown): number {
  const n = value == null ? 0 : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function main(): void {
  if (!existsSync(EXCEL_PATH)) {
    console.error(`Error: Excel no encontrado en ${EXCEL_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) {
    console.error(`Error: hoja "${SHEET_NAME}" no encontrada.`);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { defval: null, raw: true });
  if (rows.length === 0) {
    console.error("Error: hoja sin filas.");
    process.exit(1);
  }

  const headers = Object.keys(rows[0]);
  const priceHeaders = headers.filter((h) => /precio/i.test(h));
  if (priceHeaders.length === 0) {
    console.error("Error: no se detectaron columnas de precio (/precio/i).");
    process.exit(1);
  }
  const defaultHeader =
    priceHeaders.find((h) => /publico/i.test(h)) ?? priceHeaders[0];

  const departments = new Map<string, string>(); // code → name
  const seenCodes = new Map<string, string>(); // code → rawArticulo
  const data: string[] = [];

  let products = 0;
  let sections = 0;
  let skipped = 0;
  let collisions = 0;

  rows.forEach((row, idx) => {
    const excelRowNum = idx + 2;
    const articulo = row["Articulo"];
    const nombre = row["Nombre"];
    const deptName = row["NombreDepartamento"];

    const onlyArticulo = !isBlank(articulo) && isBlank(nombre) && isBlank(deptName);
    if (onlyArticulo) {
      sections++;
      return;
    }
    if (isBlank(articulo) || isBlank(nombre) || isBlank(deptName)) {
      skipped++;
      return;
    }

    const code = normalizeProductCode(String(articulo));
    if (!CODE_REGEX.test(code)) {
      skipped++;
      console.warn(`Fila ${excelRowNum}: code inválido "${articulo}" → "${code}", omitido`);
      return;
    }
    if (seenCodes.has(code)) {
      collisions++;
      console.warn(
        `Fila ${excelRowNum}: colisión de code "${code}" (ya tomado por "${seenCodes.get(code)}"), omitido`
      );
      return;
    }
    seenCodes.set(code, String(articulo));

    const departmentCode = normalizeDepartmentCode(String(deptName));
    const departmentNameStr = String(deptName).trim();
    if (!departments.has(departmentCode)) {
      departments.set(departmentCode, departmentNameStr);
    }

    // Precios multi-tier
    const prices: Array<{ name: string; price: number; isDefault?: boolean }> = [];
    for (const header of priceHeaders) {
      const raw = row[header];
      const value = raw == null ? 0 : Number(raw);
      const safeValue = Number.isFinite(value) ? value : 0;
      const isDefault = header === defaultHeader;
      if (isDefault) {
        prices.push({ name: priceTierName(header), price: safeValue, isDefault: true });
      } else if (safeValue > 0) {
        prices.push({ name: priceTierName(header), price: safeValue });
      }
    }

    const sat = row["Codigo SAT"];
    const satProductCode =
      !isBlank(sat) && /^\d{8}$/.test(String(sat)) ? String(sat) : undefined;

    const unit = String(row["Unidad"] ?? "PZA").trim() || "PZA";

    const obj: Record<string, unknown> = {
      code,
      name: String(nombre).trim(),
      unit,
      departmentCode,
      departmentName: departmentNameStr,
      ivaRate: toRate(row["Iva"]),
      iepsRate: toRate(row["Ieps"]),
      quantity: toNumberOrZero(row["Existencia"]),
      prices,
    };
    if (satProductCode) obj.satProductCode = satProductCode;

    data.push("  " + JSON.stringify(obj) + ",");
    products++;
  });

  const departmentLines = Array.from(departments.entries())
    .map(([code, name]) => `  ${JSON.stringify({ code, name })},`)
    .join("\n");

  const content = `// AUTO-GENERADO por prisma/seeds/data/generate-inventory-data.ts — NO editar a mano.
// Fuente: INVENTARIO AGRISAS 2.0.xlsx. Regenerar con:
//   npx ts-node --project prisma/seeds/tsconfig.json prisma/seeds/data/generate-inventory-data.ts

export interface DepartmentRow {
  code: string;
  name: string;
}

export interface InventoryRow {
  code: string;
  name: string;
  unit: string;
  departmentCode: string;
  departmentName: string;
  satProductCode?: string;
  ivaRate?: number;
  iepsRate?: number;
  /** El generador no lee columna del Excel; el engine defaultea a \`true\`. Actualizar si el Excel expone la columna. */
  isTaxable?: boolean;
  /** Existencia inicial cargada en la sucursal matriz. */
  quantity?: number;
  prices: Array<{
    name: string;
    price: number;
    isDefault?: boolean;
  }>;
}

export const DEPARTMENTS: DepartmentRow[] = [
${departmentLines}
];

export const INVENTORY_DATA: InventoryRow[] = [
${data.join("\n")}
];
`;

  writeFileSync(OUT_PATH, content, "utf8");

  console.log(`[generate-inventory-data] Escrito: ${OUT_PATH}`);
  console.log(
    `  Productos: ${products} | Departamentos: ${departments.size} | Headers sección: ${sections} | Omitidos: ${skipped} | Colisiones: ${collisions}`
  );
  console.log(`  Columnas de precio: ${priceHeaders.map((h) => `"${h.trim()}"`).join(", ")}`);
  console.log(`  Default tier: "${defaultHeader.trim()}"`);
}

main();
