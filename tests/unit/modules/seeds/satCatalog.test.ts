import { readFileSync } from "node:fs";
import * as path from "node:path";
import {
  parseSatCatalogTsv,
  verifySatCatalogChecksum,
  loadSatCatalog,
  SAT_CATALOG_SOURCE,
} from "../../../../prisma/seeds/lib/satCatalog";

const TSV_PATH = path.resolve(__dirname, "..", "..", "..", "..", "prisma", "seeds", "data", "sat-codes.tsv");

describe("satCatalog — parseSatCatalogTsv", () => {
  it("parses valid TSV lines into entries", () => {
    const tsv = "01010101\tNo existe en el catálogo\n10151500\tSemillas y plántulas vegetales\n";
    expect(parseSatCatalogTsv(tsv)).toEqual([
      { code: "01010101", description: "No existe en el catálogo" },
      { code: "10151500", description: "Semillas y plántulas vegetales" },
    ]);
  });

  it("ignores blank lines and trims whitespace", () => {
    const tsv = "\n\n01010101\tNo existe en el catálogo\n\n   \n";
    expect(parseSatCatalogTsv(tsv)).toHaveLength(1);
  });

  it("accepts descriptions containing a tab-free apostrophe and escaped quotes", () => {
    const tsv = "10151501\tSemillas o plántulas de fríjol\n";
    expect(parseSatCatalogTsv(tsv)[0].description).toBe("Semillas o plántulas de fríjol");
  });

  it("rejects a line without a tab separator", () => {
    expect(() => parseSatCatalogTsv("01010101 sin tab")).toThrow(/sin tabulador/);
  });

  it("rejects a non-8-digit code", () => {
    expect(() => parseSatCatalogTsv("123\tShort\n")).toThrow(/Código SAT inválido/);
    expect(() => parseSatCatalogTsv("1234567\tShort\n")).toThrow(/Código SAT inválido/);
    expect(() => parseSatCatalogTsv("123456789\tLong\n")).toThrow(/Código SAT inválido/);
  });

  it("rejects an empty description", () => {
    expect(() => parseSatCatalogTsv("01010101\t\n")).toThrow(/Descripción vacía/);
  });

  it("rejects duplicate codes", () => {
    const tsv = "01010101\tUno\n01010101\tOtro\n";
    expect(() => parseSatCatalogTsv(tsv)).toThrow(/duplicado/);
  });
});

describe("satCatalog — verifySatCatalogChecksum", () => {
  it("passes when the TSV checksum matches the documented one", () => {
    expect(() => verifySatCatalogChecksum(readFileSync(TSV_PATH, "utf-8"))).not.toThrow();
  });

  it("throws when the TSV content differs from the documented checksum", () => {
    expect(() => verifySatCatalogChecksum("01010101\ttampered\n")).toThrow(/Checksum mismatch/);
  });
});

describe("satCatalog — loadSatCatalog (catálogo real embebido)", () => {
  it("loads the full real catalog with the documented row count", () => {
    const entries = loadSatCatalog();
    expect(entries).toHaveLength(SAT_CATALOG_SOURCE.rowCount);
  });

  it("keeps known real codes with their official descriptions (verificación de procedencia)", () => {
    const byCode = new Map(loadSatCatalog().map((e) => [e.code, e.description]));
    expect(byCode.get("01010101")).toBe("No existe en el catálogo");
    expect(byCode.get("10151500")).toBe("Semillas y plántulas vegetales");
    expect(byCode.get("84111506")).toBe("Servicios de facturación");
  });

  it("does not keep the wrong placeholder descriptions (ej. 10161500 no es 'Fertilizantes')", () => {
    const byCode = new Map(loadSatCatalog().map((e) => [e.code, e.description]));
    expect(byCode.get("10161500")).toBe("Árboles y arbustos");
  });
});

