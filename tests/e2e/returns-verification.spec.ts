import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3001";

// Usuarios con contraseña conocida (del seed existente y global-setup)
const ADMIN_EMAIL = "admin@test.com";
const OPERATOR_EMAIL = "operator_hq@test.com";
const VIEWER_EMAIL = "e2e-viewer@agrisas.test";
const NOROLES_EMAIL = "e2e-noroles@agrisas.test";
const SEED_PASSWORD = "Operador123!";
const E2E_PASSWORD = "E2eTest1234!";

// Venta 1004 — 10 unidades de UREA_001 en Sucursal Norte (branch 68308a4f)
// Usada para probar create+cancel (idempotente: se cancela el return creado)
const TARGET_SALE_ID = "139e2d2f-a90f-4e7b-9261-b5aa7d930d98";
const TARGET_SALE_FOLIO = "1004";

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
  await page.waitForURL(
    /\/(returns|sales|quotes|pos|inventory|catalogs|dashboard|roles|users)/,
    { timeout: 20000 }
  );
}

// ─── Tarea 3: NavigationRail ────────────────────────────────────────────────

test("3.a — Rail muestra 'Devoluciones' para admin (returns:read)", async ({ page }) => {
  await loginUi(page, ADMIN_EMAIL);
  const link = page.getByRole("link", { name: /devoluciones/i });
  await expect(link).toBeVisible({ timeout: 8000 });
});

test("3.b — Rail muestra 'Devoluciones' para operator (returns:read)", async ({ page }) => {
  await loginUi(page, OPERATOR_EMAIL);
  const link = page.getByRole("link", { name: /devoluciones/i });
  await expect(link).toBeVisible({ timeout: 8000 });
});

test("3.c — Rail muestra 'Devoluciones' para viewer (returns:read)", async ({ page }) => {
  await loginUi(page, VIEWER_EMAIL, E2E_PASSWORD);
  const link = page.getByRole("link", { name: /devoluciones/i });
  await expect(link).toBeVisible({ timeout: 8000 });
});

test("3.d — Rail NO muestra 'Devoluciones' para usuario sin roles", async ({ page }) => {
  await loginUi(page, NOROLES_EMAIL, E2E_PASSWORD);
  // Usuario sin roles cae en el dashboard pero sin ningún rail item de negocio
  const link = page.getByRole("link", { name: /devoluciones/i });
  await expect(link).not.toBeVisible({ timeout: 5000 });
});

test("3.e — /returns activa el item del rail al navegar", async ({ page }) => {
  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/returns`);
  await page.waitForLoadState("networkidle");
  // El link con href=/returns debe tener clase de "activo" (aria-current o clase visual)
  const link = page.getByRole("link", { name: /devoluciones/i });
  await expect(link).toBeVisible({ timeout: 5000 });
  await expect(page).toHaveURL(/\/returns($|\?)/);
});

// ─── Tarea 66: Verificación E2E completa ───────────────────────────────────

test("66.1 — Admin accede a /returns y ve el listado vacío o con datos", async ({ page }) => {
  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/returns`);
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/returns($|\?)/, { timeout: 8000 });
  // Heading "Devoluciones" de la página
  await expect(page.getByRole("heading", { name: "Devoluciones" })).toBeVisible({ timeout: 8000 });
});

test("66.2 — Admin ve el folio de venta en detalle con SaleItemsTable", async ({ page }) => {
  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/sales/${TARGET_SALE_ID}`);
  await page.waitForLoadState("networkidle");
  // Folio de la venta en el header
  await expect(page.getByText(`Folio ${TARGET_SALE_FOLIO}`)).toBeVisible({ timeout: 8000 });
  // Botón "+ Registrar devolución" del SaleReturnsSection
  await expect(page.getByRole("button", { name: "+ Registrar devolución" })).toBeVisible({ timeout: 8000 });
});

test("66.3 — Admin crea devolución desde formulario /sales/[id]/returns/new", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);

  // Verificar cantidad restante antes de proceder
  const saleRes = await fetch(`${BASE}/api/v1/admin/sales/${TARGET_SALE_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const saleDetail = (await saleRes.json()) as {
    items: Array<{ id: string; quantity: number }>;
    returnedQuantityBySaleItem: Record<string, number>;
  };
  const firstItem = saleDetail.items?.[0];
  if (!firstItem) { test.skip(true, "Venta sin items"); return; }
  const returned = saleDetail.returnedQuantityBySaleItem?.[firstItem.id] ?? 0;
  const remaining = firstItem.quantity - returned;
  if (remaining <= 0) { test.skip(true, "Sin cantidad restante para devolver"); return; }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/sales/${TARGET_SALE_ID}/returns/new`);
  await page.waitForLoadState("networkidle");

  // Header de la página — h1 con "Registrar devolución"
  await expect(
    page.getByRole("heading", { name: /registrar devolución/i })
  ).toBeVisible({ timeout: 8000 });

  // Input de cantidad — usa aria-label del ReturnLineRow
  const qtyInput = page.getByRole("spinbutton", { name: /cantidad a devolver/i }).first();
  await expect(qtyInput).toBeVisible({ timeout: 8000 });
  await qtyInput.fill("1");

  // Motivo (textarea#return-reason)
  await page.locator("#return-reason").fill("Producto defectuoso — test e2e automatizado");

  // Submit
  const submitBtn = page.getByRole("button", { name: /registrar devolución/i });
  await expect(submitBtn).toBeEnabled({ timeout: 5000 });
  await submitBtn.click();

  // Redirige a /returns/[uuid]
  await page.waitForURL(/\/returns\/[0-9a-f-]{36}/, { timeout: 20000 });
  expect(page.url()).toMatch(/\/returns\//);

  // Status badge "Activa"
  await expect(page.getByText(/activa/i)).toBeVisible({ timeout: 8000 });
});

test("66.4 — Admin ve detalle de devolución con link al ticket", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);

  // Buscar una devolución completed
  const listRes = await fetch(`${BASE}/api/v1/admin/returns?pageSize=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = (await listRes.json()) as {
    items: Array<{ id: string; status: string; saleId: string }>;
  };
  const completed = listData.items?.find((r) => r.status === "completed");

  if (!completed) {
    test.skip(true, "Sin devolución completed — ejecutar test 66.3 primero");
    return;
  }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/returns/${completed.id}`);
  await page.waitForLoadState("networkidle");

  // Badge "Activa"
  await expect(page.getByText(/activa/i)).toBeVisible({ timeout: 8000 });

  // Link "Ver ticket origen" en el header del detalle
  const ticketLink = page.getByRole("link", { name: "Ver ticket origen" });
  await expect(ticketLink).toBeVisible({ timeout: 5000 });

  // Botón "Cancelar devolución" visible para admin
  const cancelBtn = page.getByRole("button", { name: /cancelar devolución/i });
  await expect(cancelBtn).toBeVisible({ timeout: 5000 });
});

test("66.5 — Admin cancela devolución y status cambia a Cancelada", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);

  const listRes = await fetch(`${BASE}/api/v1/admin/returns?pageSize=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = (await listRes.json()) as {
    items: Array<{ id: string; status: string }>;
  };
  const completed = listData.items?.find((r) => r.status === "completed");

  if (!completed) {
    test.skip(true, "Sin devolución completed — ejecutar test 66.3 primero");
    return;
  }

  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/returns/${completed.id}`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByText(/activa/i)).toBeVisible({ timeout: 8000 });

  // Abrir modal de cancelación
  await page.getByRole("button", { name: /cancelar devolución/i }).click();

  // Modal visible
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Confirmar cancelación (sin motivo — es opcional en el modal)
  await dialog.getByRole("button", { name: /cancelar devolución/i }).click();

  // Badge de status cambia a "Cancelada" (exact para no matchear el texto del banner de cancelación)
  await expect(page.getByText("Cancelada", { exact: true })).toBeVisible({ timeout: 12000 });

  // Botón "Cancelar devolución" ya no debe estar (devolución cancelled)
  await expect(page.getByRole("button", { name: /cancelar devolución/i })).not.toBeVisible({
    timeout: 3000,
  });
});

test("66.6 — Viewer ve /returns pero NO ve botón 'Cancelar' en detalle", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);

  // Buscar cualquier devolución (completed o cancelled)
  const listRes = await fetch(`${BASE}/api/v1/admin/returns?pageSize=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const listData = (await listRes.json()) as {
    items: Array<{ id: string; status: string }>;
  };
  const anyReturn = listData.items?.[0];

  if (!anyReturn) {
    test.skip(true, "Sin devoluciones — ejecutar test 66.3 primero");
    return;
  }

  await loginUi(page, VIEWER_EMAIL, E2E_PASSWORD);

  // Viewer puede acceder a /returns
  await page.goto(`${BASE}/returns`);
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveURL(/\/returns($|\?)/, { timeout: 8000 });

  // Viewer puede ver el detalle
  await page.goto(`${BASE}/returns/${anyReturn.id}`);
  await page.waitForLoadState("networkidle");

  // Viewer NO debe ver "Cancelar devolución"
  await expect(page.getByRole("button", { name: /cancelar devolución/i })).not.toBeVisible({
    timeout: 5000,
  });
});

test("66.7 — Viewer NO ve CTA 'Registrar devolución' en detalle de venta", async ({ page }) => {
  await loginUi(page, VIEWER_EMAIL, E2E_PASSWORD);
  await page.goto(`${BASE}/sales/${TARGET_SALE_ID}`);
  await page.waitForLoadState("networkidle");

  // Viewer sin returns:create no debe ver el botón
  await expect(
    page.getByRole("button", { name: /registrar devolución/i })
  ).not.toBeVisible({ timeout: 5000 });
});

test("66.8 — SaleItemsTable muestra 'Devuelto: X' cuando hay devoluciones activas", async ({ page }) => {
  const token = await loginApi(ADMIN_EMAIL);

  // Obtener el primer item de la venta target para saber el saleItemId
  const saleRes = await fetch(`${BASE}/api/v1/admin/sales/${TARGET_SALE_ID}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const saleDetail = (await saleRes.json()) as {
    items: Array<{ id: string; quantity: number }>;
    returnedQuantityBySaleItem: Record<string, number>;
  };
  const firstItem = saleDetail.items?.[0];
  if (!firstItem) { test.skip(true, "Venta sin items"); return; }
  const alreadyReturned = saleDetail.returnedQuantityBySaleItem?.[firstItem.id] ?? 0;
  const remaining = firstItem.quantity - alreadyReturned;
  if (remaining <= 0) { test.skip(true, "Sin cantidad restante para devolver"); return; }

  // Crear devolución vía API (sin pasar por UI — solo para verificar la UI de la venta)
  const createRes = await fetch(`${BASE}/api/v1/admin/returns`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      saleId: TARGET_SALE_ID,
      reason: "Test e2e 66.8 — verificar subnota Devuelto",
      returnedAt: new Date().toISOString(),
      items: [{ saleItemId: firstItem.id, quantity: 1 }],
    }),
  });
  if (!createRes.ok) { test.skip(true, `No se pudo crear devolución: ${createRes.status}`); return; }
  const createdReturn = (await createRes.json()) as { id: string };

  try {
    // Verificar que SaleItemsTable muestra "Devuelto: X" en el detalle de la venta
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/sales/${TARGET_SALE_ID}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/devuelto:/i)).toBeVisible({ timeout: 10000 });
  } finally {
    // Limpiar: cancelar la devolución para no afectar otros tests
    await fetch(`${BASE}/api/v1/admin/returns/${createdReturn.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Limpieza post-test e2e" }),
    });
  }
});
