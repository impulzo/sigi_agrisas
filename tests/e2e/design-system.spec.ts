import { test, expect, type Page } from "@playwright/test";
import { login } from "./helpers";

/**
 * Verificación end-to-end de homogeneidad visual (ver designer.md y
 * openspec/specs/design-system/spec.md). Cada aserción codifica literalmente
 * una de las quejas del cliente que originó la estandarización: márgenes
 * distintos entre pantallas, botones de distinto color/tamaño, tablas sin
 * estándar.
 */

const LISTING_ROUTES = [
  "/dashboard",
  "/sales",
  "/quotes",
  "/returns",
  "/inventory",
  "/catalogs/products",
  "/users",
  "/reports/purchases",
  "/reports/cash-cut",
  "/settings",
];

async function loginAsAdmin(page: Page) {
  await login(page, "e2e-admin@agrisas.test");
}

test.describe("design-system — homogeneidad visual", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("el contenedor de página tiene el mismo padding en todas las rutas", async ({ page }) => {
    // 10 navegaciones con compile en frío del dev server pueden superar el timeout default de 30s.
    test.setTimeout(90000);
    const paddings: Record<string, { left: string; top: string }> = {};

    for (const route of LISTING_ROUTES) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const main = page.locator("main");
      const style = await main.evaluate((el) => {
        const computed = getComputedStyle(el);
        return { left: computed.paddingLeft, top: computed.paddingTop };
      });
      paddings[route] = style;
    }

    const values = Object.values(paddings);
    const [first, ...rest] = values;
    for (const value of rest) {
      expect(value.left).toBe(first.left);
      expect(value.top).toBe(first.top);
    }
  });

  test("el h1 de las páginas de listado mide 32px", async ({ page }) => {
    for (const route of ["/sales", "/quotes", "/returns", "/inventory", "/users"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const h1 = page.locator("h1").first();
      const fontSize = await h1.evaluate((el) => getComputedStyle(el).fontSize);
      expect(fontSize, `h1 en ${route}`).toBe("32px");
    }
  });

  test("los encabezados de tabla miden 11px en mayúsculas y las celdas 13px", async ({ page }) => {
    await page.goto("/sales");
    await page.waitForLoadState("networkidle");

    const th = page.locator("th").first();
    if (await th.count()) {
      const thStyle = await th.evaluate((el) => {
        const computed = getComputedStyle(el);
        return { fontSize: computed.fontSize, transform: computed.textTransform };
      });
      expect(thStyle.fontSize).toBe("11px");
      expect(thStyle.transform).toBe("uppercase");
    }

    const td = page.locator("tbody td").first();
    if (await td.count()) {
      const fontSize = await td.evaluate((el) => getComputedStyle(el).fontSize);
      expect(fontSize).toBe("13px");
    }
  });

  test("el CTA primario de cada ruta usa el mismo color y forma pill", async ({ page }) => {
    for (const route of ["/sales", "/quotes", "/roles"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const primaryButton = page
        .locator("button, a")
        .filter({ hasText: /nuevo|crear|agregar/i })
        .first();

      if (await primaryButton.count()) {
        const style = await primaryButton.evaluate((el) => {
          const computed = getComputedStyle(el);
          return { bg: computed.backgroundColor, radius: computed.borderRadius };
        });
        expect(style.bg, `CTA en ${route}`).toBe("rgb(13, 99, 27)");
        // pill: el radio debe ser al menos la mitad de la altura del botón (redondeo total)
        expect(parseInt(style.radius, 10)).toBeGreaterThanOrEqual(999);
      }
    }
  });

  test("ningún elemento con clase text-body-sm renderiza a 16px (regresión de token muerto)", async ({ page }) => {
    await page.goto("/sales");
    await page.waitForLoadState("networkidle");
    const offenders = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('[class*="text-body-sm"]'));
      return els
        .map((el) => getComputedStyle(el).fontSize)
        .filter((size) => size === "16px");
    });
    expect(offenders).toEqual([]);
  });
});
