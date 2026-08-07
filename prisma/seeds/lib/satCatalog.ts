/**
 * Catálogo real `c_ClaveProdServ` del SAT (Anexo 20, CFDI 4.0).
 *
 * Fuente: https://github.com/phpcfdi/resources-sat-catalogs
 *   archivo `database/data/cfdi_40_productos_servicios.sql`
 * Proyecto phpcfdi (referencia estándar en el ecosistema CFDI de México);
 * se auto-sincroniza con los catálogos publicados por el SAT cada 2 semanas.
 *
 * El data file `prisma/seeds/data/sat-codes.tsv` se genera a partir de esa
 * fuente con el siguiente pipeline (NO editar a mano):
 *
 *   1. Descargar `cfdi_40_productos_servicios.sql` del repo phpcfdi.
 *   2. Extraer (code, descripcion) de cada fila `INSERT INTO ... VALUES`.
 *   3. Escribir `sat-codes.tsv` con formato `code\t description`, ordenado por
 *      code, codificado UTF-8.
 *   4. Actualizar `tsvSha256` en `SAT_CATALOG_SOURCE`.
 *
 * `loadSatCatalog()` verifica el checksum del TSV antes de parsear, de modo
 * que una corrupción o edición manual del archivo se detecta al correr el seed.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

export interface SatCatalogEntry {
  code: string;
  description: string;
}

export const SAT_CATALOG_SOURCE = {
  url: "https://github.com/phpcfdi/resources-sat-catalogs (database/data/cfdi_40_productos_servicios.sql)",
  retrievedAt: "2026-08-06",
  version: "CFDI 4.0 — c_ClaveProdServ",
  rowCount: 52_513,
  tsvSha256: "f39307c481be0941c952632a2cfe12f4cdb2c0fd5dcf21343db911e9f1782bd5",
  sourceSqlSha256: "041f39b3719672941014a695ce4992c533501dd6c25174b6392e012034400fce",
};

const SAT_CODE_REGEX = /^\d{8}$/;

export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Verifica que el TSV no haya sido corrompido/alterado respecto a la fuente. */
export function verifySatCatalogChecksum(tsv: string): void {
  const actual = sha256(tsv);
  if (actual !== SAT_CATALOG_SOURCE.tsvSha256) {
    throw new Error(
      `Checksum mismatch en prisma/seeds/data/sat-codes.tsv: esperado ${SAT_CATALOG_SOURCE.tsvSha256}, obtenido ${actual}. ` +
        "Regenera el archivo desde la fuente oficial y actualiza tsvSha256 en satCatalog.ts."
    );
  }
}

/**
 * Parsea un TSV `code\t description` (una fila por línea, UTF-8, sin header).
 * Valida formato `^\d{8}$`, descripción no vacía y ausencia de duplicados.
 */
export function parseSatCatalogTsv(tsv: string): SatCatalogEntry[] {
  const entries: SatCatalogEntry[] = [];
  const seen = new Set<string>();
  const lines = tsv.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;
    const tabIdx = line.indexOf("\t");
    if (tabIdx === -1) {
      throw new Error(`Línea inválida en catálogo SAT (sin tabulador): "${line.slice(0, 80)}"`);
    }
    const code = line.slice(0, tabIdx).trim();
    const description = line.slice(tabIdx + 1).trim();
    if (!SAT_CODE_REGEX.test(code)) {
      throw new Error(`Código SAT inválido: "${code}"`);
    }
    if (!description.trim()) {
      throw new Error(`Descripción vacía para código ${code}`);
    }
    if (seen.has(code)) {
      throw new Error(`Código SAT duplicado: ${code}`);
    }
    seen.add(code);
    entries.push({ code, description });
  }
  return entries;
}

/** Lee el TSV desde disco, verifica checksum y lo parsea. */
export function loadSatCatalog(): SatCatalogEntry[] {
  const tsvPath = path.resolve(__dirname, "..", "data", "sat-codes.tsv");
  const tsv = readFileSync(tsvPath, "utf-8");
  verifySatCatalogChecksum(tsv);
  const entries = parseSatCatalogTsv(tsv);
  if (entries.length !== SAT_CATALOG_SOURCE.rowCount) {
    throw new Error(
      `Catálogo SAT incompleto: esperado ${SAT_CATALOG_SOURCE.rowCount} códigos, obtenido ${entries.length}.`
    );
  }
  return entries;
}
