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

type FolioScope = "POS" | "INVENTORY" | "OPERATIONS";

interface CanonicalFolio {
  code: string;
  name: string;
  prefix: string;
  scope: FolioScope;
}

const CANONICAL_FOLIOS: readonly CanonicalFolio[] = [
  { code: "TK", name: "Folio de Venta Efectivo", prefix: "TK-", scope: "POS" },
  { code: "TC", name: "Folio de Venta Crédito", prefix: "TC-", scope: "POS" },
  { code: "COT", name: "Cotización", prefix: "COT-", scope: "POS" },
  { code: "TS", name: "Traspaso entre inventarios", prefix: "TS-", scope: "INVENTORY" },
  { code: "RB", name: "Recibo de Pago - Cobranza", prefix: "RB-", scope: "OPERATIONS" },
  { code: "AB", name: "Cobranza/Abono", prefix: "AB-", scope: "OPERATIONS" },
  { code: "DEV", name: "Devolución", prefix: "DEV-", scope: "OPERATIONS" },
  { code: "CP", name: "Compras", prefix: "CP-", scope: "OPERATIONS" },
] as const;

const CANONICAL_CODES = CANONICAL_FOLIOS.map((f) => f.code);

interface AbortedReference {
  code: string;
  sales: number;
  quotes: number;
  payments: number;
}

interface Summary {
  canonicalUpserted: number;
  canonicalCreated: number;
  canonicalUpdated: number;
  legacyDeleted: number;
  abortedReferences: AbortedReference[];
}

async function main(): Promise<Summary> {
  // Phase 1: detect legacy folios and split into "safe to delete" vs "blocked by FK"
  const legacy = await prisma.folio.findMany({
    where: { code: { notIn: CANONICAL_CODES } },
    select: {
      id: true,
      code: true,
      _count: { select: { sales: true, quotes: true, payments: true } },
    },
  });

  const toDelete: { id: string; code: string }[] = [];
  const aborted: AbortedReference[] = [];

  for (const f of legacy) {
    const refs = f._count.sales + f._count.quotes + f._count.payments;
    if (refs === 0) {
      toDelete.push({ id: f.id, code: f.code });
    } else {
      aborted.push({
        code: f.code,
        sales: f._count.sales,
        quotes: f._count.quotes,
        payments: f._count.payments,
      });
    }
  }

  if (aborted.length > 0) {
    for (const a of aborted) {
      console.error(
        `Folio ${a.code} tiene ${a.sales + a.quotes + a.payments} referencias activas ` +
          `(sales: ${a.sales}, quotes: ${a.quotes}, payments: ${a.payments}); ` +
          `migra manualmente o limpia antes de re-correr`
      );
    }
    return {
      canonicalUpserted: 0,
      canonicalCreated: 0,
      canonicalUpdated: 0,
      legacyDeleted: 0,
      abortedReferences: aborted,
    };
  }

  // Phase 2: delete legacy folios without references
  let legacyDeleted = 0;
  for (const f of toDelete) {
    await prisma.folio.delete({ where: { id: f.id } });
    console.log(`Borrado folio legacy '${f.code}' (sin referencias)`);
    legacyDeleted++;
  }

  // Phase 3: upsert canonical folios
  let canonicalCreated = 0;
  let canonicalUpdated = 0;
  for (const f of CANONICAL_FOLIOS) {
    const existing = await prisma.folio.findUnique({ where: { code: f.code }, select: { id: true } });
    await prisma.folio.upsert({
      where: { code: f.code },
      create: {
        code: f.code,
        name: f.name,
        prefix: f.prefix,
        scope: f.scope,
        currentNumber: 0,
        isActive: true,
      },
      // NOTE: currentNumber is intentionally NOT updated — preserves sequential numbering
      update: {
        name: f.name,
        prefix: f.prefix,
        scope: f.scope,
        isActive: true,
      },
    });
    if (existing) {
      canonicalUpdated++;
    } else {
      canonicalCreated++;
    }
  }

  return {
    canonicalUpserted: canonicalCreated + canonicalUpdated,
    canonicalCreated,
    canonicalUpdated,
    legacyDeleted,
    abortedReferences: [],
  };
}

main()
  .then((summary) => {
    console.log("\n=== Seed folios — resumen ===");
    console.log(JSON.stringify(summary, null, 2));
    if (summary.abortedReferences.length > 0) {
      console.error("\nSeed abortado por referencias FK activas.");
      process.exit(1);
    }
    console.log("\nSeed completado.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error durante seed:folios:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
