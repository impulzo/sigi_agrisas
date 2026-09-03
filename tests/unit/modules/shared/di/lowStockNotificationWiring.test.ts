/**
 * Regresión: los contenedores DI de `quotes` y `returns` deben construir
 * `PrismaSaleRepository` con el `AdminNotificationService` inyectado — de lo
 * contrario `fireLowStockNotifications` hace early-return (`if (!this.notifier) return;`)
 * y las notificaciones de stock bajo se pierden en silencio al convertir una
 * cotización en venta o al registrar una devolución.
 *
 * Se verifica a nivel de código fuente (no import en runtime) porque ambos
 * containers importan transitivamente `@react-pdf/renderer` (vía sus
 * controllers), cuyo build ESM no es transformable por la config actual de
 * ts-jest — cargar el módulo completo en un test unitario rompería por eso,
 * no por el bug que este test busca cubrir.
 */
import * as fs from "fs";
import * as path from "path";

function readContainerSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "../../../../..", relativePath), "utf8");
}

/**
 * Extrae la línea `const saleRepo = new PrismaSaleRepository(...)` y devuelve
 * la lista de argumentos (separados por coma, top-level) pasados al constructor.
 */
function extractSaleRepoConstructorArgs(source: string): string[] {
  const match = source.match(/new PrismaSaleRepository\(([^)]*)\)/);
  if (!match) throw new Error("No se encontró `new PrismaSaleRepository(...)` en el archivo");
  const argsText = match[1].trim();
  if (argsText === "") return [];
  return argsText.split(",").map((a) => a.trim());
}

describe("DI wiring — PrismaSaleRepository recibe adminNotificationService", () => {
  it("quotes/infrastructure/di/container construye PrismaSaleRepository con notifier", () => {
    const source = readContainerSource("src/modules/quotes/infrastructure/di/container.ts");
    const args = extractSaleRepoConstructorArgs(source);
    expect(args.length).toBe(2);
    expect(args[1]).toBe("adminNotificationService");
    expect(source).toMatch(
      /import\s*\{\s*adminNotificationService\s*\}\s*from\s*["']@\/shared\/infrastructure\/di\/adminNotificationContainer["']/
    );
  });

  it("returns/infrastructure/di/container construye PrismaSaleRepository con notifier", () => {
    const source = readContainerSource("src/modules/returns/infrastructure/di/container.ts");
    const args = extractSaleRepoConstructorArgs(source);
    expect(args.length).toBe(2);
    expect(args[1]).toBe("adminNotificationService");
  });

  it("pos/infrastructure/di/container (referencia — ya correcto hoy) sigue construyendo PrismaSaleRepository con notifier", () => {
    const source = readContainerSource("src/modules/pos/infrastructure/di/container.ts");
    const args = extractSaleRepoConstructorArgs(source);
    expect(args.length).toBe(2);
  });
});
