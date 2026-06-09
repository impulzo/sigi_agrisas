import path from "node:path";
import { existsSync } from "node:fs";
import * as dotenv from "dotenv";

const ENV_LOCAL = path.resolve(__dirname, "..", "..", ".env.local");
const ENV_FILE = path.resolve(__dirname, "..", "..", ".env");
if (existsSync(ENV_LOCAL)) {
  dotenv.config({ path: ENV_LOCAL });
} else if (existsSync(ENV_FILE)) {
  dotenv.config({ path: ENV_FILE });
}

import { Prisma, PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";

const prisma = new PrismaClient();

const EXCEL_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "INVENTARIO PARA SISTEMA NUEVO.xlsx"
);
const SHEET_NAME = "Hoja1";
const CODE_REGEX = /^[A-Z0-9_]{1,32}$/;
const EXPECTED_HEADERS = [
  "CLAVE",
  "Nombre",
  "Unidad",
  "SerLibres",
  "Iva",
  "Ieps",
  "NombreDepartamento",
] as const;

const HQ_CODE = "MATRIZ";
const HQ_NAME = "Matriz";

type ExcelRow = {
  CLAVE: string | null;
  Nombre: string | null;
  Unidad: string | null;
  SerLibres: number | null;
  Iva: number | null;
  Ieps: number | null;
  NombreDepartamento: string | null;
};

function normalizeDepartmentCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 32);
}

function normalizeProductCode(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/\*/g, "")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 32);
}

function toDecimalRate(value: number | null | undefined): Prisma.Decimal {
  const n = value == null ? 0 : Number(value);
  if (!Number.isFinite(n)) return new Prisma.Decimal(0).toDecimalPlaces(4);
  return new Prisma.Decimal(n / 100).toDecimalPlaces(4);
}

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

async function main(): Promise<void> {
  console.log(`[seed:inventory] Cargando workbook: ${EXCEL_PATH}`);

  if (!existsSync(EXCEL_PATH)) {
    throw new Error(`Archivo Excel no encontrado en: ${EXCEL_PATH}`);
  }

  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(
      `Hoja "${SHEET_NAME}" no encontrada. Hojas disponibles: ${workbook.SheetNames.join(", ")}`
    );
  }

  const rows = XLSX.utils.sheet_to_json<ExcelRow>(sheet, {
    defval: null,
    raw: true,
  });

  if (rows.length === 0) {
    throw new Error(`La hoja "${SHEET_NAME}" no contiene filas de datos.`);
  }

  const firstRowKeys = Object.keys(rows[0]);
  const missingHeaders = EXPECTED_HEADERS.filter(
    (h) => !firstRowKeys.includes(h)
  );
  if (missingHeaders.length > 0) {
    throw new Error(
      `Cabeceras faltantes en la hoja "${SHEET_NAME}": ${missingHeaders.join(", ")}. ` +
        `Cabeceras encontradas: ${firstRowKeys.join(", ")}`
    );
  }

  let sectionHeaderCount = 0;
  let missingNameCount = 0;
  const validRows: ExcelRow[] = [];

  rows.forEach((row, idx) => {
    const excelRowNum = idx + 2;
    const hasOnlyClave =
      !isBlank(row.CLAVE) &&
      isBlank(row.Nombre) &&
      isBlank(row.Unidad) &&
      isBlank(row.Iva) &&
      isBlank(row.Ieps) &&
      isBlank(row.NombreDepartamento);
    if (hasOnlyClave) {
      sectionHeaderCount++;
      return;
    }
    if (isBlank(row.Nombre)) {
      missingNameCount++;
      console.warn(
        `[seed:inventory] Fila ${excelRowNum}: omitida por Nombre vacío (CLAVE=${row.CLAVE ?? "(vacío)"})`
      );
      return;
    }
    if (isBlank(row.NombreDepartamento)) {
      missingNameCount++;
      console.warn(
        `[seed:inventory] Fila ${excelRowNum}: omitida por NombreDepartamento vacío (CLAVE=${row.CLAVE ?? "(vacío)"})`
      );
      return;
    }
    validRows.push(row);
  });

  console.log(
    `[seed:inventory] Filas totales: ${rows.length} | encabezados de sección: ${sectionHeaderCount} | omitidas (sin nombre/depto): ${missingNameCount} | válidas: ${validRows.length}`
  );

  const departmentNames = Array.from(
    new Set(
      validRows.map((r) => String(r.NombreDepartamento).trim()).filter((s) => s.length > 0)
    )
  );

  const departmentMap = new Map<string, string>();
  let deptsUpserted = 0;

  for (const name of departmentNames) {
    const code = normalizeDepartmentCode(name);
    if (!CODE_REGEX.test(code)) {
      throw new Error(
        `Code de departamento inválido tras normalizar: name="${name}" → code="${code}"`
      );
    }
    const dept = await prisma.department.upsert({
      where: { code },
      create: { code, name, isActive: true },
      update: { name, isActive: true },
    });
    departmentMap.set(name, dept.id);
    deptsUpserted++;
  }

  console.log(`[seed:inventory] Departments upserted: ${deptsUpserted}`);

  const conflictingHq = await prisma.branch.findFirst({
    where: { isHeadquarters: true, code: { not: HQ_CODE } },
  });
  if (conflictingHq) {
    throw new Error(
      `Another branch is already marked as headquarters: ${conflictingHq.code} (${conflictingHq.name}). ` +
        `Desmárcala o renómbrala antes de re-ejecutar este seed.`
    );
  }

  const branchMatriz = await prisma.branch.upsert({
    where: { code: HQ_CODE },
    create: {
      code: HQ_CODE,
      name: HQ_NAME,
      isHeadquarters: true,
      isActive: true,
    },
    update: { isHeadquarters: true, isActive: true },
  });

  console.log(
    `[seed:inventory] Branch ${HQ_CODE}: upserted (id=${branchMatriz.id}, isHeadquarters=true)`
  );

  let productsUpserted = 0;
  let productsSkipped = 0;
  let pricesEnsured = 0;
  let inventoryUpserted = 0;
  let codesNormalized = 0;
  let collisionsSkipped = 0;
  const seenCodes = new Map<string, { row: number; rawClave: string }>();

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const excelRowNum = i + 2;
    const rawClave = row.CLAVE;
    if (isBlank(rawClave)) {
      productsSkipped++;
      console.warn(
        `[seed:inventory] Fila ${excelRowNum}: omitida por CLAVE vacía`
      );
      continue;
    }
    const rawClaveStr = String(rawClave);
    const code = normalizeProductCode(rawClaveStr);
    if (!CODE_REGEX.test(code)) {
      productsSkipped++;
      console.warn(
        `[seed:inventory] Fila ${excelRowNum}: CLAVE inválida "${rawClaveStr}" (normalizada: "${code}") — no matchea ${CODE_REGEX}`
      );
      continue;
    }
    const naiveCode = rawClaveStr.trim().toUpperCase();
    if (naiveCode !== code) {
      codesNormalized++;
      console.warn(
        `[seed:inventory] Fila ${excelRowNum}: CLAVE normalizada "${rawClaveStr}" → "${code}"`
      );
    }
    const previous = seenCodes.get(code);
    if (previous) {
      collisionsSkipped++;
      productsSkipped++;
      console.warn(
        `[seed:inventory] Fila ${excelRowNum}: colisión de code "${code}" — ya fue tomado por fila ${previous.row} (CLAVE="${previous.rawClave}"); se omite esta (CLAVE="${rawClaveStr}")`
      );
      continue;
    }
    seenCodes.set(code, { row: excelRowNum, rawClave: rawClaveStr });

    const name = String(row.Nombre).trim();
    if (name.length === 0) {
      productsSkipped++;
      console.warn(
        `[seed:inventory] Fila ${excelRowNum}: Nombre vacío tras trim (CLAVE=${code})`
      );
      continue;
    }

    const deptName = String(row.NombreDepartamento).trim();
    const departmentId = departmentMap.get(deptName);
    if (!departmentId) {
      throw new Error(
        `Departamento no encontrado en el mapa: "${deptName}" (fila ${excelRowNum}, CLAVE=${code})`
      );
    }

    const ivaRate = toDecimalRate(row.Iva);
    const iepsRate = toDecimalRate(row.Ieps);
    const unit = String(row.Unidad ?? "PZA").trim() || "PZA";

    const product = await prisma.product.upsert({
      where: { code },
      create: {
        code,
        name,
        unit,
        ivaRate,
        iepsRate,
        departmentId,
        satProductCode: null,
        isActive: true,
      },
      update: {
        name,
        unit,
        ivaRate,
        iepsRate,
        departmentId,
        isActive: true,
      },
    });
    productsUpserted++;

    const existingDefault = await prisma.productPrice.findFirst({
      where: { productId: product.id, isDefault: true },
    });
    if (!existingDefault) {
      await prisma.productPrice.create({
        data: {
          productId: product.id,
          name: "Default",
          price: new Prisma.Decimal(0),
          minQuantity: 1,
          discountPct: null,
          isDefault: true,
        },
      });
      pricesEnsured++;
    }

    await prisma.branchInventory.upsert({
      where: {
        branchId_productId: {
          branchId: branchMatriz.id,
          productId: product.id,
        },
      },
      create: {
        branchId: branchMatriz.id,
        productId: product.id,
        quantity: new Prisma.Decimal(0),
        reservedQuantity: new Prisma.Decimal(0),
        reorderPoint: new Prisma.Decimal(0),
      },
      update: {},
    });
    inventoryUpserted++;
  }

  console.log("");
  console.log("=== Resumen del seed de inventario ===");
  console.log(`  Departments upserted:           ${deptsUpserted}`);
  console.log(`  Branch ${HQ_CODE} upserted:           1 (isHeadquarters=true)`);
  console.log(`  Products upserted:              ${productsUpserted}`);
  console.log(`  Products skipped:               ${productsSkipped}`);
  console.log(`    └─ por colisión de code:      ${collisionsSkipped}`);
  console.log(`  Codes normalizados (soft):      ${codesNormalized}`);
  console.log(`  ProductPrices default created:  ${pricesEnsured}`);
  console.log(`  BranchInventory rows upserted:  ${inventoryUpserted}`);
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("[seed:inventory] ERROR FATAL:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
