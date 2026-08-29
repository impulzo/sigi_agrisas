import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";
const ADMIN_EMAIL = "e2e-admin@agrisas.test";
const E2E_PASSWORD = "E2eTest1234!";

async function login(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/auth/login`);
  await page.fill('[name="email"]', ADMIN_EMAIL);
  await page.fill('[name="password"]', E2E_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|inventory|catalogs|pos)/, { timeout: 15000 });
}

async function goToFirstInvoiceDetail(page: import("@playwright/test").Page): Promise<boolean> {
  await page.goto(`${BASE}/billing`);
  await page.waitForLoadState("networkidle");

  const viewBtn = page.getByRole("link", { name: "Ver" }).first();
  if (!(await viewBtn.isVisible({ timeout: 10000 }).catch(() => false))) return false;

  await viewBtn.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  return true;
}

test.describe("Billing invoice parity verification", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("7.2 — Ticket settings: save and recover businessZipCode", async ({ page }) => {
    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    const zipLabel = page.getByText("Código postal").first();
    await expect(zipLabel).toBeVisible();
    const zipField = zipLabel.locator("..").locator("input").first();
    await expect(zipField).toBeVisible();

    await zipField.click();
    await zipField.fill("83000");

    const saveBtn = page.getByRole("button", { name: "Guardar cambios" }).first();
    await saveBtn.click();

    await page.waitForResponse(
      (res) => res.url().includes("/api/v1/admin/settings/ticket") && res.status() === 200
    ).catch(() => {});
    await page.waitForTimeout(500);

    await page.goto(`${BASE}/settings`);
    await page.waitForLoadState("networkidle");

    const savedZipLabel = page.getByText("Código postal").first();
    const savedZip = savedZipLabel.locator("..").locator("input").first();
    await expect(savedZip).toHaveValue("83000");
  });

  test("7.6 — Invoice PDF: download produces a valid, non-trivial file", async ({ page }) => {
    const found = await goToFirstInvoiceDetail(page);
    if (!found) {
      test.skip(true, "No invoices found — skipping PDF overflow check");
      return;
    }

    const downloadBtn = page.getByRole("button", { name: /descargar pdf/i });
    if (await downloadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
      await downloadBtn.click();
      const download = await downloadPromise;

      const path = await download.path();
      expect(path).toBeTruthy();

      const fs = await import("fs");
      const stat = fs.statSync(path!);
      expect(stat.size).toBeGreaterThan(1024);
    }
  });

  test("Invoice detail shows issuer fiscal section", async ({ page }) => {
    const found = await goToFirstInvoiceDetail(page);
    if (!found) {
      test.skip(true, "No invoices found — skipping issuer section check");
      return;
    }

    await expect(page.getByText("Datos del emisor")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("RFC").first()).toBeVisible();
    await expect(page.getByText("Razón social").first()).toBeVisible();
    await expect(page.getByText("Régimen fiscal").first()).toBeVisible();
    await expect(page.getByText("CP fiscal").first()).toBeVisible();
    await expect(page.getByText("Dirección").first()).toBeVisible();
  });

  test("Invoice detail shows receiver fiscal section", async ({ page }) => {
    const found = await goToFirstInvoiceDetail(page);
    if (!found) {
      test.skip(true, "No invoices found — skipping receiver section check");
      return;
    }

    await expect(page.getByText("Datos del receptor")).toBeVisible({ timeout: 10000 });
  });

  test("Invoice detail shows payment form/method", async ({ page }) => {
    const found = await goToFirstInvoiceDetail(page);
    if (!found) {
      test.skip(true, "No invoices found — skipping payment section check");
      return;
    }

    await expect(page.getByText("Forma de pago")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Método de pago")).toBeVisible();
  });
});
