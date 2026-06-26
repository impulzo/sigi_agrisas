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

import { PrismaClient } from "@prisma/client";
import { CODE_REGEX } from "./lib/normalize";
import {
  seedInventory,
  printSeedReport,
  type PrismaLike,
} from "./lib/inventorySeedLogic";
import {
  DEPARTMENTS,
  INVENTORY_DATA,
} from "./data/inventario-agrisas-v2";

const prisma = new PrismaClient();

const HQ_CODE = "MATRIZ";
const HQ_NAME = "Matriz";

async function main(): Promise<void> {
  console.log(
    `[seed:inventory] Datos embebidos: ${DEPARTMENTS.length} departamentos, ${INVENTORY_DATA.length} productos`
  );

  // 1. Departamentos (upsert por code)
  let deptsUpserted = 0;
  for (const dept of DEPARTMENTS) {
    if (!CODE_REGEX.test(dept.code)) {
      throw new Error(
        `Code de departamento inválido: code="${dept.code}" name="${dept.name}"`
      );
    }
    await prisma.department.upsert({
      where: { code: dept.code },
      create: { code: dept.code, name: dept.name, isActive: true },
      update: { name: dept.name, isActive: true },
    });
    deptsUpserted++;
  }
  console.log(`[seed:inventory] Departments upserted: ${deptsUpserted}`);

  // 2. Sucursal matriz (guard de HQ conflictiva)
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
    create: { code: HQ_CODE, name: HQ_NAME, isHeadquarters: true, isActive: true },
    update: { isHeadquarters: true, isActive: true },
  });
  console.log(
    `[seed:inventory] Branch ${HQ_CODE}: upserted (id=${branchMatriz.id}, isHeadquarters=true)`
  );

  // 3. Productos + precios + SAT + inventario (engine canónico)
  const result = await seedInventory(
    prisma as unknown as PrismaLike,
    INVENTORY_DATA,
    { branchId: branchMatriz.id }
  );

  printSeedReport(result);
}

main()
  .catch((error) => {
    console.error("[seed:inventory] ERROR FATAL:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
