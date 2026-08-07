import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3001";

const ADMIN_EMAIL = "e2e-admin@agrisas.test";
const VIEWER_EMAIL = "e2e-viewer@agrisas.test";
const E2E_PASSWORD = "E2eTest1234!";

async function loginUi(page: Page, email: string, password: string = E2E_PASSWORD) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForSelector('[name="email"]', { state: "visible" });
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    /\/(returns|sales|quotes|pos|inventory|catalogs|dashboard|roles|users|purchases)/,
    { timeout: 20000 }
  );
}

// ─── CTA "Nueva compra" en el listado ───────────────────────────────────────

test("P1 — Admin ve 'Compras' en el rail y CTA 'Nueva compra' en /purchases", async ({ page }) => {
  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/purchases`);
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/purchases($|\?)/, { timeout: 8000 });
  await expect(page.getByRole("heading", { name: "Compras" })).toBeVisible({ timeout: 8000 });
  const cta = page.getByRole("link", { name: /nueva compra/i });
  await expect(cta).toBeVisible({ timeout: 8000 });
  await expect(cta).toHaveAttribute("href", "/purchases/new");
});

test("P2 — CTA 'Nueva compra' navega a /purchases/new", async ({ page }) => {
  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/purchases`);
  await waitForCreateCTA(page);
  await page.getByRole("link", { name: /nueva compra/i }).click();
  await expect(page).toHaveURL(/\/purchases\/new/, { timeout: 10000 });
});

test("P3 — Viewer (sin purchases:create) NO ve el CTA 'Nueva compra'", async ({ page }) => {
  await loginUi(page, VIEWER_EMAIL);
  // El rail muestra "Compras" (tiene purchases:read)
  await expect(page.getByRole("link", { name: "Compras" })).toBeVisible({ timeout: 8000 });
  await page.goto(`${BASE}/purchases`);
  await page.waitForLoadState("networkidle");
  // Sin purchases:create el CTA nunca se renderiza
  await expect(page.getByRole("link", { name: /nueva compra/i })).not.toBeVisible({ timeout: 5000 });
});

async function waitForCreateCTA(page: Page) {
  const cta = page.getByRole("link", { name: /nueva compra/i });
  await expect(cta).toBeVisible({ timeout: 8000 });
}
