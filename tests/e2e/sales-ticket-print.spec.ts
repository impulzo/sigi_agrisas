import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3001";

// Usuario admin creado por global-setup.ts (confiable en cualquier entorno e2e)
const ADMIN_EMAIL = "e2e-admin@agrisas.test";
const SEED_PASSWORD = "E2eTest1234!";

async function loginApi(email: string, password: string = SEED_PASSWORD): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  return data.accessToken;
}

async function loginUi(page: Page, email: string, password: string = SEED_PASSWORD) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForSelector('[name="email"]', { state: "visible" });
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(sales|pos|quotes|dashboard)/, { timeout: 20000 });
}

async function findCompletedSaleId(token: string): Promise<string | null> {
  const res = await fetch(`${BASE}/api/v1/admin/sales?status=completed&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await res.json()) as { items?: Array<{ id: string }> };
  return data.items?.[0]?.id ?? null;
}

test("T1 — Detalle de venta: solo 'Ver Ticket', sin botón 'Imprimir ticket' redundante", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);
  const saleId = await findCompletedSaleId(token);
  if (!saleId) { test.skip(true, "Sin venta completed — ejecutar seed"); return; }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/sales/${saleId}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("link", { name: /ver ticket/i })).toBeVisible({ timeout: 8000 });
  await expect(page.getByRole("button", { name: /imprimir ticket/i })).not.toBeVisible();
  await expect(page.getByRole("button", { name: /imprimir ticket/i })).toHaveCount(0);
});

test("T2 — Vista de ticket: botón inferior 'Imprimir Ticket' y solo el ticket en print", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);
  const saleId = await findCompletedSaleId(token);
  if (!saleId) { test.skip(true, "Sin venta completed — ejecutar seed"); return; }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/sales/${saleId}/ticket`);
  await page.waitForLoadState("networkidle");

  // Tarjeta Stitch visible en pantalla
  await expect(page.locator(".bg-surface-container-lowest")).toBeVisible({ timeout: 8000 });
  const printBtn = page.getByRole("button", { name: /imprimir ticket/i });
  await expect(printBtn).toBeVisible();

  // Modo print: solo el área .print-area queda visible
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-area")).toBeVisible();
  await expect(page.locator(".print-area").locator("img[alt='Logo']")).toBeVisible();
  // UI circundante oculta en la impresión
  await expect(page.locator(".bg-surface-container-lowest")).not.toBeVisible();
  await expect(page.getByRole("link", { name: /volver al detalle/i })).not.toBeVisible();
  await expect(printBtn).not.toBeVisible();

  // Nuevo contenido del ticket (secciones reordenadas)
  const print = page.locator(".print-area");
  await expect(print.getByText(/Vendedor:/i)).toBeVisible();
  await expect(print.getByText(/Sucursal:/i)).toBeVisible();
  await expect(print.getByText(/Total a pagar/i)).toBeVisible();

  // Logo del ticket a 125x77px (según CSS print en PrintableTicket.tsx)
  const printLogo = print.locator("img[alt='Logo']");
  await expect(printLogo).toHaveCSS("width", "125px");
  await expect(printLogo).toHaveCSS("height", "77px");

  // Volver a pantalla: tarjeta Stitch visible, ticket oculto
  await page.emulateMedia({ media: "screen" });
  await expect(page.locator(".bg-surface-container-lowest")).toBeVisible();
  await expect(page.locator(".print-area")).not.toBeVisible();
});

test("T3 — Botón 'Imprimir Ticket' dispara window.print()", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);
  const saleId = await findCompletedSaleId(token);
  if (!saleId) { test.skip(true, "Sin venta completed — ejecutar seed"); return; }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/sales/${saleId}/ticket`);
  await page.waitForLoadState("networkidle");

  await page.evaluate(() => {
    const w = window as unknown as { __printed: boolean; print: () => void };
    w.__printed = false;
    w.print = () => { w.__printed = true; };
  });

  await page.getByRole("button", { name: /imprimir ticket/i }).click();

  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __printed: boolean }).__printed))
    .toBe(true);
});

test("T4 — PDF generado incluye márgenes @page (4mm vertical, 3mm horizontal)", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);
  const saleId = await findCompletedSaleId(token);
  if (!saleId) { test.skip(true, "Sin venta completed — ejecutar seed"); return; }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/sales/${saleId}/ticket`);
  await page.waitForLoadState("networkidle");

  // Emular print media para que se aplique @page { margin: 4mm 3mm }
  await page.emulateMedia({ media: "print" });

  // Verificar que el CSS @page con márgenes está presente
  const pageMargin = await page.evaluate(() => {
    const styles = Array.from(document.styleSheets);
    for (const sheet of styles) {
      try {
        const rules = Array.from(sheet.cssRules);
        for (const rule of rules) {
          if (rule.type === CSSRule.PAGE_RULE) {
            return (rule as CSSPageRule).style.margin;
          }
        }
      } catch {
        // cross-origin stylesheet, ignorar
      }
    }
    return null;
  });

  expect(pageMargin).toBe("4mm 3mm");

  // Generar PDF real para validar que no falla y tiene contenido
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "4mm", right: "3mm", bottom: "4mm", left: "3mm" },
  });

  expect(pdfBuffer).toBeInstanceOf(Buffer);
  expect(pdfBuffer.length).toBeGreaterThan(1000); // PDF no vacío

  // Volver a screen media
  await page.emulateMedia({ media: "screen" });
});
