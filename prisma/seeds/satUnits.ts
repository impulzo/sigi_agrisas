/**
 * Seed del catálogo `c_ClaveUnidad` del SAT — CATÁLOGO REAL, no placeholder.
 *
 * Fuente: https://github.com/phpcfdi/resources-sat-catalogs
 *   archivo `database/data/cfdi_40_claves_unidades.sql` (CFDI 4.0).
 *
 * Procedencia verificable en `prisma/seeds/lib/satUnitCatalog.ts`:
 *   - SHA-256 de la fuente SQL descargada.
 *   - SHA-256 del TSV embebido (`prisma/seeds/data/sat-units.tsv`).
 * El seed aborta si el checksum del TSV no coincide (detección de corrupción).
 *
 * Estrategia: resync total idempotente. En una sola transacción borra todas
 * las filas existentes y reinserta el catálogo completo. `Product.unit` es
 * una columna suelta (sin FK al catálogo), así que los productos existentes
 * conservan su valor aunque el catálogo se re-siembre.
 */
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
import { loadSatUnitCatalog, SAT_UNIT_CATALOG_SOURCE } from "./lib/satUnitCatalog";

const prisma = new PrismaClient();

async function main(): Promise<{ deleted: number; inserted: number }> {
  const entries = loadSatUnitCatalog();
  console.log(
    `[seed:sat-units] Catálogo real cargado: ${entries.length} claves de unidad (fuente: ${SAT_UNIT_CATALOG_SOURCE.url}, obtenido ${SAT_UNIT_CATALOG_SOURCE.retrievedAt})`
  );

  const summary = await prisma.$transaction(
    async (tx) => {
      const deleted = await tx.satUnitOfMeasure.deleteMany();
      await tx.satUnitOfMeasure.createMany({
        data: entries.map((e) => ({ code: e.code, description: e.description })),
      });
      return { deleted: deleted.count, inserted: entries.length };
    },
    { maxWait: 30_000, timeout: 60_000 }
  );

  return summary;
}

main()
  .then((summary) => {
    console.log("\n=== Seed sat-units — resumen (catálogo real) ===");
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      `\nCatálogo c_ClaveUnidad (CFDI 4.0) sembrado desde ${SAT_UNIT_CATALOG_SOURCE.url}`
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error durante seed:sat-units:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
