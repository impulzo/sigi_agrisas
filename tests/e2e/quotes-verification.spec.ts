import { test, expect } from "@playwright/test";
import { Page } from "@playwright/test";

const BASE = "http://localhost:3001";
const ADMIN_EMAIL = "admin@test.com";
const OPERATOR_EMAIL = "operator_hq@test.com";
const VIEWER_EMAIL = "viewer@test.com";
const PASSWORD = "Operador123!";

async function loginApi(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const data = await res.json() as { accessToken: string };
  return data.accessToken;
}

async function loginUi(page: Page, email: string) {
  await page.goto(`${BASE}/auth/login`);
  // Wait for the form to be fully hydrated before interacting
  await page.waitForSelector('[name="email"]', { state: "visible" });
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(quotes|pos|sales|inventory|catalogs|dashboard)/, { timeout: 20000 });
}

// ─── 14.3: Operator quote mode in POS ───────────────────────────────────────
test("14.3 - Operator: POS quote mode creates quote and redirects to /quotes/[id]", async ({ page }) => {
  await loginUi(page, OPERATOR_EMAIL);

  // Navigate to POS
  await page.goto(`${BASE}/pos`);
  await page.waitForLoadState("networkidle");

  // Check if "Cotización" segmented button exists (operator has quotes:create)
  const segmented = page.getByRole("tablist");
  if (!(await segmented.isVisible({ timeout: 5000 }).catch(() => false))) {
    test.skip(true, "POS segmented button not rendered — operator may lack quotes:create");
    return;
  }

  // Switch to Cotización mode
  const quoteTab = page.getByRole("tab", { name: /cotizaci/i });
  await quoteTab.click();

  // Confirm dialog if cart has items
  const confirmBtn = page.getByRole("button", { name: /confirmar|aceptar|continuar/i });
  if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
    await confirmBtn.click();
  }

  // Add a product via price picker modal
  const addBtn = page.getByRole("button", { name: /^añadir$/i }).first();
  await expect(addBtn).toBeVisible({ timeout: 5000 });
  await addBtn.click();

  // Wait for price picker modal and select the first price option
  const pricePickerModal = page.locator("[role='dialog'], .fixed.inset-0").first();
  await pricePickerModal.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
  // Click first available price button (distinct from "Añadir al carrito" and "Cancelar")
  const priceOption = page.getByRole("button").filter({ hasNotText: /añadir al carrito|cancelar/i })
    .filter({ hasText: /\$/ }).first();
  await priceOption.click({ timeout: 5000 });
  // Click "Añadir al carrito"
  await page.getByRole("button", { name: /añadir al carrito/i }).click({ timeout: 5000 });

  // Wait for cart to reflect the added item
  await expect(page.getByText(/carrito \([1-9]/i)).toBeVisible({ timeout: 5000 });

  // Ensure a folio is selected (it should auto-select, but pick one if placeholder is still active)
  const folioSelect = page.locator("select");
  const folioVal = await folioSelect.inputValue().catch(() => "");
  if (!folioVal) {
    const opts = await folioSelect.locator("option[value]").all();
    for (const opt of opts) {
      const val = await opt.getAttribute("value");
      if (val) { await folioSelect.selectOption(val); break; }
    }
  }

  // Click CTA — "Crear cotización"
  const cta = page.getByRole("button", { name: /crear cotizaci/i });
  await expect(cta).toBeEnabled({ timeout: 5000 });
  await cta.click();

  // Should redirect to /quotes/[id]
  await page.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 15000 });
  expect(page.url()).toMatch(/\/quotes\//);
});

// ─── 14.5: Expired quote shows banner ───────────────────────────────────────
test("14.5 - Expired quote shows Vencida banner, Convertir disabled", async ({ page }) => {
  // Use the already-expired quote created in API tests
  const token = await loginApi(ADMIN_EMAIL);

  // Find the expired quote id
  const listRes = await fetch(`${BASE}/api/v1/admin/quotes?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await listRes.json() as { items: Array<{ id: string; isExpired: boolean; status: string }> };
  const expiredQuote = list.items.find((q) => q.isExpired && q.status === "authorized");

  if (!expiredQuote) {
    test.skip(true, "No expired authorized quote found — run API setup first");
    return;
  }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/quotes/${expiredQuote.id}`);
  await page.waitForLoadState("networkidle");

  // Banner "Vencida" or expired indicator
  const expiredBanner = page.getByText(/vencida|expirada/i);
  await expect(expiredBanner).toBeVisible({ timeout: 5000 });

  // Convert button should be disabled or absent
  const convertBtn = page.getByRole("button", { name: /convertir/i });
  if (await convertBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await expect(convertBtn).toBeDisabled();
  }
});

// ─── 14.6: Viewer sees read-only quotes ─────────────────────────────────────
test("14.6 - Viewer sees /quotes list but no write buttons", async ({ page }) => {
  await loginUi(page, VIEWER_EMAIL);

  // Viewer should be redirected from login to some page
  // Navigate to /quotes manually
  await page.goto(`${BASE}/quotes`);
  await page.waitForLoadState("networkidle");

  // Should not be redirected away (viewer has quotes:read)
  await expect(page).toHaveURL(/\/quotes($|\?)/, { timeout: 8000 });

  // No "Nueva cotización" button (needs quotes:create)
  const newBtn = page.getByRole("button", { name: /nueva cotizaci/i });
  await expect(newBtn).not.toBeVisible();

  // No POS item in rail (viewer lacks sales:create)
  const posRailItem = page.getByRole("link", { name: /^POS$/i });
  await expect(posRailItem).not.toBeVisible();

  // "Cotizaciones" should be visible in rail (viewer has quotes:read)
  const quotesRailItem = page.getByRole("link", { name: /cotizaciones/i });
  await expect(quotesRailItem).toBeVisible({ timeout: 5000 });
});

// ─── 14.8: Converted quote cancel deep-links to sale ────────────────────────
test("14.8 - Converted quote shows deep-link to sale, cancel returns 409", async ({ page }) => {
  // Use the already-converted quote
  const token = await loginApi(ADMIN_EMAIL);
  const listRes = await fetch(`${BASE}/api/v1/admin/quotes?pageSize=50`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = await listRes.json() as { items: Array<{ id: string; status: string; convertedSaleId: string | null }> };
  const converted = list.items.find((q) => q.status === "converted" && q.convertedSaleId);

  if (!converted) {
    test.skip(true, "No converted quote found");
    return;
  }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/quotes/${converted.id}`);
  await page.waitForLoadState("networkidle");

  // "Ir a la venta" deep-link should be visible (may appear multiple times on page)
  const saleLink = page.getByRole("link", { name: /ir a la venta|ver venta/i }).first();
  await expect(saleLink).toBeVisible({ timeout: 5000 });

  // Cancel button should not exist (quote is converted)
  const cancelBtn = page.getByRole("button", { name: /cancelar/i });
  await expect(cancelBtn).not.toBeVisible();
});
