/**
 * Seed del catálogo `c_ClaveProdServ` del SAT — CATÁLOGO REAL, no placeholder.
 *
 * Fuente: https://github.com/phpcfdi/resources-sat-catalogs
 *   archivo `database/data/cfdi_40_productos_servicios.sql` (CFDI 4.0).
 * El proyecto phpcfdi se auto-sincroniza con los catálogos que publica el SAT
 * y es la referencia estándar del ecosistema CFDI en México. El subconjunto
 * placeholder previo (~60 códigos) se reemplazó por el catálogo completo
 * (52,513 códigos) con descripciones verificadas contra la fuente.
 *
 * Procedencia verificable en `prisma/seeds/lib/satCatalog.ts`:
 *   - SHA-256 de la fuente SQL descargada.
 *   - SHA-256 del TSV embebido (`prisma/seeds/data/sat-codes.tsv`).
 * El seed aborta si el checksum del TSV no coincide (detección de corrupción).
 *
 * Estrategia: resync total idempotente. En una sola transacción borra todas
 * las filas existentes y reinserta el catálogo completo en lotes. `Product.sat
 * ProductCode` es una columna suelta (sin FK al catálogo), así que las ventas
 * existentes conservan sus códigos aunque el catálogo se re-siembre.
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
import { loadSatCatalog, SAT_CATALOG_SOURCE } from "./lib/satCatalog";

const prisma = new PrismaClient();

const BATCH_SIZE = 5_000;

async function main(): Promise<{ deleted: number; inserted: number }> {
  const entries = loadSatCatalog();
  console.log(
    `[seed:sat-codes] Catálogo real cargado: ${entries.length} códigos (fuente: ${SAT_CATALOG_SOURCE.url}, obtenido ${SAT_CATALOG_SOURCE.retrievedAt})`
  );

  const summary = await prisma.$transaction(
    async (tx) => {
      const deleted = await tx.satProductServiceCode.deleteMany();
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const chunk = entries.slice(i, i + BATCH_SIZE).map((e) => ({
          code: e.code,
          description: e.description,
        }));
        await tx.satProductServiceCode.createMany({ data: chunk });
      }
      return { deleted: deleted.count, inserted: entries.length };
    },
    { maxWait: 30_000, timeout: 180_000 }
  );

  return summary;
}

main()
  .then((summary) => {
    console.log("\n=== Seed sat-codes — resumen (catálogo real) ===");
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      `\nCatálogo c_ClaveProdServ (CFDI 4.0) sembrado desde ${SAT_CATALOG_SOURCE.url}`
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error durante seed:sat-codes:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
