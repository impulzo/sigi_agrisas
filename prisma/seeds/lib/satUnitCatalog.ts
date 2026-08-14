/**
 * Catálogo real `c_ClaveUnidad` del SAT (Anexo 20, CFDI 4.0).
 *
 * Fuente: https://github.com/phpcfdi/resources-sat-catalogs
 *   archivo `database/data/cfdi_40_claves_unidades.sql` (CFDI 4.0).
 * Mismo proyecto de referencia que `satCatalog.ts` (c_ClaveProdServ).
 *
 * El data file `prisma/seeds/data/sat-units.tsv` se genera a partir de esa
 * fuente con el siguiente pipeline (NO editar a mano):
 *
 *   1. Descargar `cfdi_40_claves_unidades.sql` del repo phpcfdi.
 *   2. Extraer (code, descripcion) de cada fila `INSERT INTO ... VALUES`
 *      (la fila trae columnas adicionales — nota, vigencia, símbolo — que
 *      se descartan).
 *   3. Escribir `sat-units.tsv` con formato `code\tdescription`, ordenado
 *      por code, codificado UTF-8.
 *   4. Actualizar `tsvSha256` en `SAT_UNIT_CATALOG_SOURCE`.
 *
 * `loadSatUnitCatalog()` verifica el checksum del TSV antes de parsear, de
 * modo que una corrupción o edición manual del archivo se detecta al correr
 * el seed.
 */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

export interface SatUnitCatalogEntry {
  code: string;
  description: string;
}

export const SAT_UNIT_CATALOG_SOURCE = {
  url: "https://github.com/phpcfdi/resources-sat-catalogs (database/data/cfdi_40_claves_unidades.sql)",
  retrievedAt: "2026-08-13",
  version: "CFDI 4.0 — c_ClaveUnidad",
  rowCount: 2_418,
  tsvSha256: "b250a86c00bc34b87fd1bb60021815dfde3af17b17d0faa87814e50818263c79",
  sourceSqlSha256: "9d1b8f781c0a2eb251ada699c2de67ec2537c56385e958ce6f336b9f7959147c",
};

const SAT_UNIT_CODE_REGEX = /^[A-Za-z0-9]{2,3}$/;

export function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Verifica que el TSV no haya sido corrompido/alterado respecto a la fuente. */
export function verifySatUnitCatalogChecksum(tsv: string): void {
  const actual = sha256(tsv);
  if (actual !== SAT_UNIT_CATALOG_SOURCE.tsvSha256) {
    throw new Error(
      `Checksum mismatch en prisma/seeds/data/sat-units.tsv: esperado ${SAT_UNIT_CATALOG_SOURCE.tsvSha256}, obtenido ${actual}. ` +
        "Regenera el archivo desde la fuente oficial y actualiza tsvSha256 en satUnitCatalog.ts."
    );
  }
}

/**
 * Parsea un TSV `code\t description` (una fila por línea, UTF-8, sin header).
 * Valida formato `^[A-Za-z0-9]{2,3}$`, descripción no vacía y ausencia de
 * duplicados.
 */
export function parseSatUnitCatalogTsv(tsv: string): SatUnitCatalogEntry[] {
  const entries: SatUnitCatalogEntry[] = [];
  const seen = new Set<string>();
  const lines = tsv.split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;
    const tabIdx = line.indexOf("\t");
    if (tabIdx === -1) {
      throw new Error(`Línea inválida en catálogo de unidades SAT (sin tabulador): "${line.slice(0, 80)}"`);
    }
    const code = line.slice(0, tabIdx).trim();
    const description = line.slice(tabIdx + 1).trim();
    if (!SAT_UNIT_CODE_REGEX.test(code)) {
      throw new Error(`Código de unidad SAT inválido: "${code}"`);
    }
    if (!description.trim()) {
      throw new Error(`Descripción vacía para código de unidad ${code}`);
    }
    if (seen.has(code)) {
      throw new Error(`Código de unidad SAT duplicado: ${code}`);
    }
    seen.add(code);
    entries.push({ code, description });
  }
  return entries;
}

/** Lee el TSV desde disco, verifica checksum y lo parsea. */
export function loadSatUnitCatalog(): SatUnitCatalogEntry[] {
  const tsvPath = path.resolve(__dirname, "..", "data", "sat-units.tsv");
  const tsv = readFileSync(tsvPath, "utf-8");
  verifySatUnitCatalogChecksum(tsv);
  const entries = parseSatUnitCatalogTsv(tsv);
  if (entries.length !== SAT_UNIT_CATALOG_SOURCE.rowCount) {
    throw new Error(
      `Catálogo de unidades SAT incompleto: esperado ${SAT_UNIT_CATALOG_SOURCE.rowCount} códigos, obtenido ${entries.length}.`
    );
  }
  return entries;
}
