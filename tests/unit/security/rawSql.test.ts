/**
 * Guardarraíl: impide que una PR futura reintroduzca SQL crudo inseguro.
 *
 * Es un análisis léxico (regex), no un parser AST completo — cubre el patrón
 * real que existe hoy en el repo (identificadores simples interpolados para
 * ensamblar texto SQL — nombres de columna, cláusulas WHERE/LIMIT/OFFSET ya
 * parametrizadas por posición) y bloquea el patrón de riesgo real: cualquier
 * cosa que no sea un identificador simple o un literal de cadena dentro de
 * `Prisma.raw(...)`, o dentro de un `${...}` de un template literal pasado a
 * `$queryRawUnsafe`/`$executeRawUnsafe` (concatenación, llamadas a función,
 * acceso a propiedades de `req`/`body`/`input`, etc.).
 */
import * as fs from "fs";
import * as path from "path";

const SRC_ROOT = path.resolve(__dirname, "../../../src");
const BARE_IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
const STRING_LITERAL = /^(["'])(?:(?!\1)[^\\]|\\.)*\1$/;

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listTsFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".ts")) out.push(full);
  }
  return out;
}

/** Encuentra template literals `` `...` `` permitiendo `${...}` sin backticks anidados. */
const TEMPLATE_LITERAL = /`(?:\\.|\$\{[^{}]*\}|[^`\\])*`/g;

/** Extrae las expresiones dentro de cada `${...}` de un template literal. */
function extractInterpolations(templateLiteral: string): string[] {
  const matches = templateLiteral.match(/\$\{([^{}]*)\}/g) ?? [];
  return matches.map((m) => m.slice(2, -1).trim());
}

interface Violation {
  file: string;
  snippet: string;
  reason: string;
}

function checkPrismaRawCalls(file: string, source: string, violations: Violation[]): void {
  const regex = /Prisma\.raw\(([^()]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(source))) {
    const arg = match[1].trim();
    if (BARE_IDENTIFIER.test(arg) || STRING_LITERAL.test(arg)) continue;
    violations.push({
      file,
      snippet: match[0],
      reason: `Prisma.raw() argument "${arg}" is neither a bare identifier nor a string literal`,
    });
  }
}

function checkRawUnsafeCalls(file: string, source: string, violations: Violation[]): void {
  const callSites = [...source.matchAll(/\$(?:query|execute)RawUnsafe(?:<[^>]*>)?\s*\(/g)];
  for (const call of callSites) {
    const afterCall = source.slice(call.index! + call[0].length, call.index! + call[0].length + 4000);
    const templateMatch = afterCall.match(TEMPLATE_LITERAL);
    if (!templateMatch) continue; // first arg is not a template literal (e.g. a plain string) — nothing to check
    const templateLiteral = templateMatch[0];
    for (const expr of extractInterpolations(templateLiteral)) {
      if (BARE_IDENTIFIER.test(expr)) continue;
      violations.push({
        file,
        snippet: `\${${expr}}`,
        reason: `$queryRawUnsafe/$executeRawUnsafe template interpolates a non-identifier expression: ${expr}`,
      });
    }
  }
}

describe("Guardarraíl — sin SQL crudo inseguro", () => {
  it("Prisma.raw() y $queryRawUnsafe/$executeRawUnsafe solo interpolan identificadores simples o literales", () => {
    const violations: Violation[] = [];
    for (const file of listTsFiles(SRC_ROOT)) {
      const source = fs.readFileSync(file, "utf8");
      if (!source.includes("Prisma.raw(") && !/\$(?:query|execute)RawUnsafe/.test(source)) continue;
      checkPrismaRawCalls(file, source, violations);
      checkRawUnsafeCalls(file, source, violations);
    }

    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${path.relative(SRC_ROOT, v.file)}: ${v.reason} (${v.snippet})`)
        .join("\n");
      throw new Error(`Uso de SQL crudo potencialmente inseguro detectado:\n${report}`);
    }
  });

  // Fixtures sintéticos (no archivos reales) que prueban que el detector
  // realmente detecta el patrón de riesgo, no solo que hoy no encuentra nada.
  it("detecta Prisma.raw() con un valor que no es identificador ni literal", () => {
    const violations: Violation[] = [];
    checkPrismaRawCalls(
      "fixture.ts",
      "await tx.$executeRaw`UPDATE t SET ${Prisma.raw(req.body.column)} = 1`;",
      violations
    );
    expect(violations).toHaveLength(1);
  });

  it("detecta concatenación dentro de Prisma.raw()", () => {
    const violations: Violation[] = [];
    checkPrismaRawCalls("fixture.ts", "Prisma.raw('a' + userInput)", violations);
    expect(violations).toHaveLength(1);
  });

  it("detecta interpolación no identificador dentro de $queryRawUnsafe", () => {
    const violations: Violation[] = [];
    checkRawUnsafeCalls(
      "fixture.ts",
      "await this.prisma.$queryRawUnsafe(`SELECT * FROM t WHERE x = ${req.body.id}`, ...params);",
      violations
    );
    expect(violations).toHaveLength(1);
  });

  it("no marca una interpolación de identificador simple dentro de $executeRawUnsafe", () => {
    const violations: Violation[] = [];
    checkRawUnsafeCalls(
      "fixture.ts",
      "await this.prisma.$executeRawUnsafe(`SELECT * FROM t WHERE ${whereClause}`, ...params);",
      violations
    );
    expect(violations).toHaveLength(0);
  });
});
