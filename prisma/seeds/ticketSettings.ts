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

const prisma = new PrismaClient();

const SINGLETON_ID = "ticket-settings-singleton";

const BUSINESS_IDENTITY = {
  businessName: "IVAN ENRIQUE OLIVERA RAMIREZ",
  businessRfc: "OIRI8506123Y7",
  businessAddress: "LIBRES # 105 CENTRO, OCOTLAN DE MORELOS, OAXACA. C.P. 71510",
  businessPhone: "CEL. 951 292 80 86",
  businessTaxRegime: "612 Personas Físicas con Actividad Empresarial",
} as const;

async function main(): Promise<{ created: boolean }> {
  const existing = await prisma.ticketSettings.findUnique({ where: { id: SINGLETON_ID } });

  if (!existing) {
    await prisma.ticketSettings.create({
      data: { id: SINGLETON_ID, paperWidth: "80mm", ...BUSINESS_IDENTITY },
    });
    return { created: true };
  }

  await prisma.ticketSettings.update({
    where: { id: SINGLETON_ID },
    data: BUSINESS_IDENTITY,
  });
  return { created: false };
}

main()
  .then(({ created }) => {
    console.log(`Seed ticket-settings: ${created ? "fila creada" : "fila existente actualizada"} con identidad fiscal del emisor.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error durante seed:ticket-settings:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
