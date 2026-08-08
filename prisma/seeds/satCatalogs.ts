/**
 * Seed de los catálogos SAT de régimen fiscal (`c_RegimenFiscal`) y uso CFDI
 * (`c_UsoCFDI`) — CFDI 4.0.
 *
 * Fuente: https://github.com/phpcfdi/resources-sat-catalogs
 *   archivos `database/data/cfdi_40_regimenes_fiscales.sql` y
 *   `database/data/cfdi_40_usos_cfdi.sql`.
 * El proyecto phpcfdi se auto-sincroniza con los catálogos que publica el SAT
 * y es la referencia estándar del ecosistema CFDI en México.
 *
 * Son catálogos pequeños (19 régimenes, 24 usos), por eso se embeben como data
 * estática (mismo precedente que `prisma/seeds/folios.ts`), no como TSV con
 * checksum como el catálogo de productos `sat-codes.tsv` (52,513 códigos).
 *
 * Estrategia: idempotente. En una sola transacción hace `upsert` por `code` en
 * ambas tablas, de modo que correr el seed N veces produce el mismo resultado
 * sin duplicados ni errores.
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

const prisma = new PrismaClient();

interface CatalogEntry {
  code: string;
  description: string;
}

/** Catálogo oficial c_RegimenFiscal (CFDI 4.0) — obtenido de phpcfdi/resources-sat-catalogs. */
export const SAT_TAX_REGIMES: CatalogEntry[] = [
  { code: "601", description: "General de Ley Personas Morales" },
  { code: "603", description: "Personas Morales con Fines no Lucrativos" },
  { code: "605", description: "Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { code: "606", description: "Arrendamiento" },
  { code: "607", description: "Régimen de Enajenación o Adquisición de Bienes" },
  { code: "608", description: "Demás ingresos" },
  { code: "610", description: "Residentes en el Extranjero sin Establecimiento Permanente en México" },
  { code: "611", description: "Ingresos por Dividendos (socios y accionistas)" },
  { code: "612", description: "Personas Físicas con Actividades Empresariales y Profesionales" },
  { code: "614", description: "Ingresos por intereses" },
  { code: "615", description: "Régimen de los ingresos por obtención de premios" },
  { code: "616", description: "Sin obligaciones fiscales" },
  { code: "620", description: "Sociedades Cooperativas de Producción que optan por diferir sus ingresos" },
  { code: "621", description: "Incorporación Fiscal" },
  { code: "622", description: "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras" },
  { code: "623", description: "Opcional para Grupos de Sociedades" },
  { code: "624", description: "Coordinados" },
  { code: "625", description: "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas" },
  { code: "626", description: "Régimen Simplificado de Confianza" },
];

/** Catálogo oficial c_UsoCFDI (CFDI 4.0) — obtenido de phpcfdi/resources-sat-catalogs. */
export const SAT_CFDI_USES: CatalogEntry[] = [
  { code: "G01", description: "Adquisición de mercancías." },
  { code: "G02", description: "Devoluciones, descuentos o bonificaciones." },
  { code: "G03", description: "Gastos en general." },
  { code: "I01", description: "Construcciones." },
  { code: "I02", description: "Mobiliario y equipo de oficina por inversiones." },
  { code: "I03", description: "Equipo de transporte." },
  { code: "I04", description: "Equipo de computo y accesorios." },
  { code: "I05", description: "Dados, troqueles, moldes, matrices y herramental." },
  { code: "I06", description: "Comunicaciones telefónicas." },
  { code: "I07", description: "Comunicaciones satelitales." },
  { code: "I08", description: "Otra maquinaria y equipo." },
  { code: "D01", description: "Honorarios médicos, dentales y gastos hospitalarios." },
  { code: "D02", description: "Gastos médicos por incapacidad o discapacidad." },
  { code: "D03", description: "Gastos funerales." },
  { code: "D04", description: "Donativos." },
  { code: "D05", description: "Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)." },
  { code: "D06", description: "Aportaciones voluntarias al SAR." },
  { code: "D07", description: "Primas por seguros de gastos médicos." },
  { code: "D08", description: "Gastos de transportación escolar obligatoria." },
  { code: "D09", description: "Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones." },
  { code: "D10", description: "Pagos por servicios educativos (colegiaturas)." },
  { code: "S01", description: "Sin efectos fiscales." },
  { code: "CP01", description: "Pagos" },
  { code: "CN01", description: "Nómina" },
];

async function main(): Promise<{ taxRegimes: number; cfdiUses: number }> {
  const operations = [
    ...SAT_TAX_REGIMES.map((entry) =>
      prisma.satTaxRegime.upsert({
        where: { code: entry.code },
        update: { description: entry.description },
        create: { code: entry.code, description: entry.description },
      })
    ),
    ...SAT_CFDI_USES.map((entry) =>
      prisma.satCfdiUse.upsert({
        where: { code: entry.code },
        update: { description: entry.description },
        create: { code: entry.code, description: entry.description },
      })
    ),
  ];

  await prisma.$transaction(operations);

  return { taxRegimes: SAT_TAX_REGIMES.length, cfdiUses: SAT_CFDI_USES.length };
}

main()
  .then((summary) => {
    console.log("\n=== Seed sat-catalogs — resumen ===");
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      "\nCatálogos c_RegimenFiscal y c_UsoCFDI (CFDI 4.0) sembrados desde phpcfdi/resources-sat-catalogs"
    );
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error durante seed:sat-catalogs:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
