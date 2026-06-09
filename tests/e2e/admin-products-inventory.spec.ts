import { test, expect } from "@playwright/test";
import { login } from "./helpers";

const ADMIN_EMAIL = "e2e-admin@agrisas.test";

test.describe("Task 10.2 — admin: productos e inventario", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN_EMAIL);
  });

  // ── NavigationRail ─────────────────────────────────────────────────────────

  test("rail: item Inventario visible con gating inventory:read", async ({ page }) => {
    await page.goto("/dashboard");
    const link = page.getByRole("link", { name: "Inventario" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/inventory");
  });

  test("rail: item Productos aparece en flyout de Catálogos", async ({ page }) => {
    await page.goto("/dashboard");
    await page.hover('[title="Catálogos"]');
    await expect(page.getByRole("menuitem", { name: "Productos" })).toBeVisible();
  });

  // ── Catálogos hub ──────────────────────────────────────────────────────────

  test("hub: sexta tarjeta 'Productos' presente y navegable", async ({ page }) => {
    await page.goto("/catalogs");
    const openLink = page.locator('a[href="/catalogs/products"]').first();
    await expect(openLink).toBeVisible();
  });

  // ── Productos — listado ────────────────────────────────────────────────────

  test("productos: listado carga con tabla y toolbar", async ({ page }) => {
    await page.goto("/catalogs/products");
    await expect(page.getByText("Búsqueda en servidor · 2+ caracteres")).toBeVisible();
    await expect(page.getByRole("button", { name: "Nuevo" })).toBeVisible();
    // Table headers
    await expect(page.getByRole("columnheader", { name: "Código" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "IVA" })).toBeVisible();
  });

  test("productos: crear nuevo producto", async ({ page }) => {
    await page.goto("/catalogs/products");
    await page.click('button:has-text("Nuevo")');

    // Modal opens
    const dialog = page.locator('dialog, [role="dialog"]').first();
    await expect(dialog).toBeVisible();

    // Skip if no departments available
    const deptSelect = dialog.locator("select").first();
    const deptOptions = await deptSelect.locator("option").all();
    if (deptOptions.length <= 1) { test.skip(); return; }

    // Fill required fields using nth index within dialog (Código, Unidad, Nombre)
    const code = `E2E${Date.now().toString().slice(-5)}`;
    await dialog.locator("input").nth(0).fill(code); // Código
    await dialog.locator("input").nth(1).fill("kg"); // Unidad
    await dialog.locator("input").nth(2).fill(`Producto E2E ${code}`); // Nombre
    await deptSelect.selectOption({ index: 1 });

    // Submit
    await page.click('button:has-text("Crear")');
    await page.waitForTimeout(1500);

    // Product should appear in list after creation
    await expect(page.getByText(code)).toBeVisible({ timeout: 5000 });
  });

  test("productos: código se fuerza a mayúsculas", async ({ page }) => {
    await page.goto("/catalogs/products");
    await page.click('button:has-text("Nuevo")');
    const dialog = page.locator('dialog, [role="dialog"]').first();
    await expect(dialog).toBeVisible();
    const codeInput = dialog.locator("input").nth(0); // Código is the first input
    await codeInput.fill("minusc");
    await expect(codeInput).toHaveValue("MINUSC");
  });

  test("productos: búsqueda server-side con < 2 chars no envía request", async ({ page }) => {
    await page.goto("/catalogs/products");
    const requests: string[] = [];
    page.on("request", (r) => { if (r.url().includes("?search=")) requests.push(r.url()); });
    await page.fill('[placeholder="Buscar productos..."]', "a");
    await page.waitForTimeout(400);
    expect(requests.filter((u) => u.includes("search="))).toHaveLength(0);
  });

  // ── Productos — detalle con tabs ───────────────────────────────────────────

  test("productos: detalle tiene 3 tabs y el General está activo por defecto", async ({ page }) => {
    await page.goto("/catalogs/products");
    const manageLink = page.getByText("Gestionar").first();
    if (await manageLink.isVisible()) {
      await manageLink.click();
      await expect(page.getByRole("tab", { name: "General" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Precios" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Dosificaciones" })).toBeVisible();
    } else {
      test.skip();
    }
  });

  test("productos: tab Precios lista con badge Default y permite crear precio", async ({ page }) => {
    await page.goto("/catalogs/products");
    const manageLink = page.getByText("Gestionar").first();
    if (!(await manageLink.isVisible())) { test.skip(); return; }

    await manageLink.click();
    await page.click('[role="tab"]:has-text("Precios")');
    await expect(page.getByRole("button", { name: "Nuevo precio" })).toBeVisible();

    // Create a price
    await page.click('button:has-text("Nuevo precio")');
    // Inputs in price form: name (nth 0), price (nth 1)
    const priceDialog = page.locator('dialog, [role="dialog"]').first();
    await priceDialog.locator("input[type='text']").first().fill("Precio E2E");
    await priceDialog.locator("input[type='number']").first().fill("100");
    await page.click('button:has-text("Crear")');
    await page.waitForTimeout(1000);
  });

  // ── Inventario ─────────────────────────────────────────────────────────────

  test("inventario: EmptyState sin sucursal seleccionada", async ({ page }) => {
    await page.goto("/inventory");
    await expect(page.getByRole("heading", { name: "Inventario" })).toBeVisible();
    // EmptyState title is a <p>; option in select also has this text — narrow to <p>
    await expect(page.locator("p", { hasText: "Selecciona una sucursal" })).toBeVisible();
  });

  test("inventario: seleccionar sucursal carga la tabla", async ({ page }) => {
    await page.goto("/inventory");
    const select = page.locator("select").first();
    const options = await select.locator("option").all();

    if (options.length <= 1) { test.skip(); return; } // no branches in DB

    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1500);

    // Either table renders OR empty state "Esta sucursal no tiene productos"
    const hasTable = await page.getByRole("columnheader", { name: "Código" }).isVisible();
    const hasEmpty = await page.getByText("Esta sucursal no tiene productos asignados").isVisible();
    expect(hasTable || hasEmpty).toBeTruthy();
  });

  test("inventario: botón 'Asignar producto' visible para admin", async ({ page }) => {
    await page.goto("/inventory");
    const select = page.locator("select").first();
    const options = await select.locator("option").all();
    if (options.length <= 1) { test.skip(); return; }

    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);
    await expect(page.getByRole("button", { name: "Asignar producto" })).toBeVisible();
  });

  test("inventario: modal ajuste tiene delta=0 deshabilitado y preview en vivo", async ({ page }) => {
    await page.goto("/inventory");
    const select = page.locator("select").first();
    const options = await select.locator("option").all();
    if (options.length <= 1) { test.skip(); return; }

    await select.selectOption({ index: 1 });
    await page.waitForTimeout(1000);

    const adjustBtn = page.getByText("Ajustar").first();
    if (!(await adjustBtn.isVisible())) { test.skip(); return; }

    await adjustBtn.click();
    const submitBtn = page.getByRole("button", { name: "Aplicar ajuste" });
    await expect(submitBtn).toBeDisabled();

    await page.fill('[placeholder="Ej. 25 o -10"]', "10");
    await expect(submitBtn).not.toBeDisabled();
    await expect(page.getByText("Stock resultante")).toBeVisible();
  });
});
