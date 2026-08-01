/**
 * ⚠️ PLACEHOLDER — NO ES EL CATÁLOGO OFICIAL DEL SAT.
 *
 * El catálogo real `c_ClaveProdServ` del SAT tiene más de 52,000 códigos y
 * requiere descargarse desde la fuente oficial del SAT (no disponible en
 * este entorno de desarrollo). Este seed siembra un subconjunto pequeño
 * (~60 códigos) de rubros comunes en el giro agro/agroquímico del cliente,
 * compilado a partir de conocimiento general sobre la estructura del
 * catálogo (basado en UNSPSC) — NO es una descarga verificada del listado
 * vigente del SAT.
 *
 * NO usar este subconjunto como fuente de verdad para timbrado de CFDI en
 * producción sin validar cada código contra el catálogo oficial del SAT
 * (https://www.sat.gob.mx, sección "Catálogos" del Anexo 20). Reemplazar
 * este archivo cuando se disponga del archivo oficial (CSV/XLSX).
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

interface SatCodeSeed {
  code: string;
  description: string;
}

const PLACEHOLDER_SAT_CODES: readonly SatCodeSeed[] = [
  // Semillas y material vegetal
  { code: "10151500", description: "Semillas y granos para siembra" },
  { code: "10151501", description: "Semillas de granos básicos" },
  { code: "10151502", description: "Semillas de hortalizas" },
  { code: "10151503", description: "Semillas de forraje" },
  { code: "10151700", description: "Plantas o material vegetal" },
  { code: "10151701", description: "Plántulas y esquejes" },
  // Fertilizantes
  { code: "10161500", description: "Fertilizantes" },
  { code: "10161501", description: "Fertilizantes nitrogenados" },
  { code: "10161502", description: "Fertilizantes fosfatados" },
  { code: "10161503", description: "Fertilizantes potásicos" },
  { code: "10161504", description: "Fertilizantes orgánicos" },
  { code: "10161505", description: "Fertilizantes foliares" },
  // Plaguicidas y agroquímicos
  { code: "10171500", description: "Plaguicidas o pesticidas agrícolas" },
  { code: "10171501", description: "Herbicidas" },
  { code: "10171502", description: "Insecticidas" },
  { code: "10171503", description: "Fungicidas" },
  { code: "10171504", description: "Acaricidas" },
  { code: "10171505", description: "Nematicidas" },
  { code: "10171506", description: "Reguladores de crecimiento vegetal" },
  // Alimento y suplementos para ganado
  { code: "10191500", description: "Alimento para animales de granja" },
  { code: "10191501", description: "Forraje y alimento balanceado" },
  { code: "10191502", description: "Suplementos alimenticios para ganado" },
  { code: "10191503", description: "Sales minerales para ganado" },
  // Sanidad animal / veterinaria agropecuaria
  { code: "10121500", description: "Productos veterinarios" },
  { code: "10121501", description: "Vacunas para ganado" },
  { code: "10121502", description: "Desparasitantes" },
  { code: "10121503", description: "Antibióticos veterinarios" },
  // Maquinaria y equipo agrícola
  { code: "21101500", description: "Maquinaria agrícola" },
  { code: "21101501", description: "Tractores agrícolas" },
  { code: "21101502", description: "Implementos de labranza" },
  { code: "21101503", description: "Sembradoras" },
  { code: "21101504", description: "Cosechadoras" },
  { code: "21101505", description: "Aspersoras agrícolas" },
  // Herramientas agrícolas manuales
  { code: "27112700", description: "Herramientas agrícolas manuales" },
  { code: "27112701", description: "Azadones" },
  { code: "27112702", description: "Machetes" },
  { code: "27112703", description: "Podadoras manuales" },
  { code: "27112704", description: "Palas agrícolas" },
  // Sistemas de riego
  { code: "40142000", description: "Sistemas y equipo de riego" },
  { code: "40142001", description: "Tubería de riego por goteo" },
  { code: "40142002", description: "Aspersores de riego" },
  { code: "40142003", description: "Bombas de agua para riego" },
  { code: "40142004", description: "Cintillas de riego" },
  // Empaque y embalaje agrícola
  { code: "14111500", description: "Sacos y costales" },
  { code: "14111501", description: "Costales de rafia" },
  { code: "14111502", description: "Bolsas de plástico para empaque agrícola" },
  { code: "14111503", description: "Cajas de cartón para producto agrícola" },
  // Protección de cultivos (mallas, acolchados)
  { code: "12141600", description: "Materiales de protección de cultivos" },
  { code: "12141601", description: "Mallas antigranizo" },
  { code: "12141602", description: "Acolchado plástico agrícola" },
  { code: "12141603", description: "Tutores y rafia para cultivo" },
  // Servicios agropecuarios
  { code: "70141500", description: "Servicios de asesoría agrícola" },
  { code: "70141501", description: "Servicios de fumigación" },
  { code: "70141502", description: "Servicios de análisis de suelo" },
  // Genérico / por definir
  { code: "01010101", description: "No existe en el catálogo (uso genérico)" },
  { code: "84111506", description: "Servicios de facturación (uso administrativo genérico)" },
];

async function main(): Promise<{ upserted: number; created: number; updated: number }> {
  let created = 0;
  let updated = 0;

  for (const entry of PLACEHOLDER_SAT_CODES) {
    const existing = await prisma.satProductServiceCode.findUnique({ where: { code: entry.code } });
    await prisma.satProductServiceCode.upsert({
      where: { code: entry.code },
      create: { code: entry.code, description: entry.description },
      update: { description: entry.description },
    });
    if (existing) updated++;
    else created++;
  }

  return { upserted: created + updated, created, updated };
}

main()
  .then((summary) => {
    console.log("\n=== Seed sat-codes — resumen (PLACEHOLDER, no oficial) ===");
    console.log(JSON.stringify(summary, null, 2));
    console.log("\nSeed completado. Recuerda: este es un subconjunto placeholder, no el catálogo oficial del SAT.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error durante seed:sat-codes:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
