import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3001";

const ADMIN_EMAIL = "e2e-admin@agrisas.test";
const NOROLES_EMAIL = "e2e-noroles@agrisas.test";
const E2E_PASSWORD = "E2eTest1234!";

async function loginUi(page: Page, email: string, password: string = E2E_PASSWORD) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForSelector('[name="email"]', { state: "visible" });
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    /\/(returns|sales|quotes|pos|inventory|catalogs|dashboard|roles|users|purchases|reports)/,
    { timeout: 20000 }
  );
}

// ─── Fixtures aisladas: sucursal propia, sin tocar E2E-MATRIZ ni otros specs ──
// Habilitan los botones de export (deshabilitados sin datos) para poder
// verificar una descarga real de PDF/Excel, no solo presencia del botón.

const prisma = new PrismaClient();

const FIXTURE_BRANCH_CODE = "E2E-RPT";
const FIXTURE_CUSTOMER_RFC = "RPT010101AA1";
const FIXTURE_PROVIDER_RFC = "XPO010101AA1"; // sembrado por global-setup (seedE2eSatCatalog)
const FIXTURE_PRODUCT_CODE = "E2E-PROD-SAT"; // idem
const FIXTURE_PAYMENT_METHOD_CODE = "TRANSFERENCIA"; // idem

async function seedReportFixtures() {
  const provider = await prisma.provider.findUniqueOrThrow({ where: { rfc: FIXTURE_PROVIDER_RFC } });
  const product = await prisma.product.findUniqueOrThrow({ where: { code: FIXTURE_PRODUCT_CODE } });
  const paymentMethod = await prisma.paymentMethod.findUniqueOrThrow({ where: { code: FIXTURE_PAYMENT_METHOD_CODE } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });

  const branch = await prisma.branch.upsert({
    where: { code: FIXTURE_BRANCH_CODE },
    update: {},
    create: { code: FIXTURE_BRANCH_CODE, name: "E2E Reportes" },
  });

  const customer = await prisma.customer.upsert({
    where: { rfc: FIXTURE_CUSTOMER_RFC },
    update: {},
    create: { code: "E2E-RPT-CUST", name: "E2E Cliente Reportes", rfc: FIXTURE_CUSTOMER_RFC },
  });

  const price = await prisma.productPrice.upsert({
    where: { productId_name: { productId: product.id, name: "E2E Menudeo" } },
    update: {},
    create: { productId: product.id, name: "E2E Menudeo", price: 100, isDefault: true },
  });

  const purchaseFolio = await prisma.folio.upsert({
    where: { code: "E2E-CP" },
    update: {},
    create: { code: "E2E-CP", name: "Compra E2E", prefix: "E2E-", scope: "OPERATIONS", currentNumber: 0 },
  });
  const providerPaymentFolio = await prisma.folio.upsert({
    where: { code: "E2E-RPT-RB" },
    update: {},
    create: { code: "E2E-RPT-RB", name: "Pago Proveedor E2E", prefix: "E2E-RB-", scope: "OPERATIONS", currentNumber: 0 },
  });
  const salesFolio = await prisma.folio.upsert({
    where: { code: "E2E-RPT-TK" },
    update: {},
    create: { code: "E2E-RPT-TK", name: "Ticket E2E", prefix: "E2E-TK-", scope: "POS", currentNumber: 0 },
  });
  const collectionsFolio = await prisma.folio.upsert({
    where: { code: "E2E-RPT-RCB" },
    update: {},
    create: { code: "E2E-RPT-RCB", name: "Recibo E2E", prefix: "E2E-RCB-", scope: "OPERATIONS", currentNumber: 0 },
  });

  // Limpieza idempotente: borra fixtures previas de esta sucursal antes de recrear.
  await prisma.customerPayment.deleteMany({ where: { branchId: branch.id } });
  await prisma.saleItem.deleteMany({ where: { sale: { branchId: branch.id } } });
  await prisma.sale.deleteMany({ where: { branchId: branch.id } });
  await prisma.providerPayment.deleteMany({ where: { branchId: branch.id } });
  await prisma.purchase.deleteMany({ where: { branchId: branch.id } });

  const purchase = await prisma.purchase.create({
    data: {
      providerId: provider.id,
      branchId: branch.id,
      folioId: purchaseFolio.id,
      folioNumber: 900001,
      folioCode: "E2E-900001",
      paymentMethodId: paymentMethod.id,
      creatorId: admin.id,
      status: "completed",
      subtotal: 1000,
      taxTotal: 160,
      total: 1160,
      paidAmount: 1160,
      paymentStatus: "paid",
    },
  });

  await prisma.providerPayment.create({
    data: {
      purchaseId: purchase.id,
      providerId: provider.id,
      branchId: branch.id,
      folioId: providerPaymentFolio.id,
      folioNumber: 1,
      folioCode: "E2E-RB-000001",
      creatorId: admin.id,
      amount: 500,
      status: "completed",
    },
  });

  const sale = await prisma.sale.create({
    data: {
      folioId: salesFolio.id,
      folioNumber: 1,
      folioCode: "E2E-TK-000001",
      branchId: branch.id,
      customerId: customer.id,
      cashierId: admin.id,
      paymentMethodId: paymentMethod.id,
      status: "completed",
      paidAmount: 116,
      paymentStatus: "paid",
      subtotal: 100,
      taxTotal: 16,
      total: 116,
      completedAt: new Date(),
    },
  });

  await prisma.saleItem.create({
    data: {
      saleId: sale.id,
      productId: product.id,
      productPriceId: price.id,
      productCodeSnapshot: product.code,
      productNameSnapshot: product.name,
      priceNameSnapshot: "E2E Menudeo",
      quantity: 1,
      unitPrice: 100,
      ivaRate: 0.16,
      iepsRate: null,
      lineSubtotal: 100,
      lineTax: 16,
      lineTotal: 116,
    },
  });

  await prisma.customerPayment.create({
    data: {
      saleId: sale.id,
      customerId: customer.id,
      userId: admin.id,
      branchId: branch.id,
      paymentMethodId: paymentMethod.id,
      folioId: collectionsFolio.id,
      folioNumber: 1,
      folioCode: "E2E-RCB-000001",
      amount: 50,
      status: "completed",
    },
  });

  return { branchId: branch.id };
}

async function cleanupReportFixtures(branchId: string) {
  await prisma.customerPayment.deleteMany({ where: { branchId } });
  await prisma.saleItem.deleteMany({ where: { sale: { branchId } } });
  await prisma.sale.deleteMany({ where: { branchId } });
  await prisma.providerPayment.deleteMany({ where: { branchId } });
  await prisma.purchase.deleteMany({ where: { branchId } });
}

test.describe("Reportes — Compras, Ventas por Producto, Cobranza (con datos)", () => {
  let fixtureBranchId: string;

  test.beforeAll(async () => {
    const { branchId } = await seedReportFixtures();
    fixtureBranchId = branchId;
  });

  test.afterAll(async () => {
    if (fixtureBranchId) await cleanupReportFixtures(fixtureBranchId);
    await prisma.$disconnect();
  });

  // ─── Hub: tarjetas nuevas visibles para admin ─────────────────────────────

  test("R1 — Admin ve las 3 tarjetas nuevas en /reports", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Reportes", level: 1 })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole("heading", { name: "Compras", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Ventas por Producto", level: 3 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cobranza", level: 3 })).toBeVisible();
  });

  // ─── Reporte de Compras ────────────────────────────────────────────────────

  test("R2 — /reports/purchases: secciones, export PDF y Excel con datos reales", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports/purchases`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Compras" })).toBeVisible({ timeout: 8000 });

    await expect(page.getByRole("tab", { name: "Compras" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Pagos a Proveedores" })).toBeVisible();
    await expect(page.getByText("E2E-900001")).toBeVisible({ timeout: 8000 });

    const [pdfDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Exportar PDF/i }).click(),
    ]);
    expect(pdfDownload.suggestedFilename()).toMatch(/^purchases-.*\.pdf$/);

    const [xlsxDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Exportar Excel/i }).click(),
    ]);
    expect(xlsxDownload.suggestedFilename()).toMatch(/^purchases-.*\.xlsx$/);

    await page.getByRole("tab", { name: "Pagos a Proveedores" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("E2E-RB-000001")).toBeVisible({ timeout: 8000 });

    const [ppPdfDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Exportar PDF/i }).click(),
    ]);
    expect(ppPdfDownload.suggestedFilename()).toMatch(/^provider-payments-.*\.pdf$/);
  });

  test("R3 — Usuario sin roles ve las tarjetas nuevas deshabilitadas ('Sin acceso') y no accede a las rutas", async ({ page }) => {
    await loginUi(page, NOROLES_EMAIL);
    await page.goto(`${BASE}/reports`);
    await page.waitForLoadState("networkidle");

    // El hub (CatalogHubCard, compartido) siempre muestra el título; sin permiso
    // reemplaza el link "Abrir" por un badge "Sin acceso" — mismo patrón que las
    // 4 tarjetas preexistentes (Estados de Cuenta, Corte de Ventas, etc.).
    await expect(page.getByRole("heading", { name: "Compras", level: 3 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir" })).toHaveCount(0);

    await page.goto(`${BASE}/reports/purchases`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Sin acceso")).toBeVisible({ timeout: 8000 });
  });

  // ─── Reporte de Ventas por Producto ────────────────────────────────────────

  test("R4 — /reports/sales-by-product: agrupación y export con datos reales", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports/sales-by-product`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Ventas por Producto" })).toBeVisible({ timeout: 8000 });

    await expect(page.getByRole("tab", { name: "Cliente" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Departamento" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Producto" })).toBeVisible();
    await expect(page.getByText("E2E Producto SAT", { exact: false })).toBeVisible({ timeout: 8000 });

    const [xlsxDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Exportar Excel/i }).click(),
    ]);
    expect(xlsxDownload.suggestedFilename()).toMatch(/^sales-by-product-.*\.xlsx$/);
  });

  // ─── Reporte de Cobranza (tab Por Cliente) ─────────────────────────────────

  test("R5 — /reports/collections: tab Por Cliente y export con datos reales", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports/collections`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Cobranza" })).toBeVisible({ timeout: 8000 });

    await page.getByRole("tab", { name: "Por Cliente" }).click();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("E2E Cliente Reportes")).toBeVisible({ timeout: 8000 });

    const [pdfDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Exportar PDF/i }).click(),
    ]);
    expect(pdfDownload.suggestedFilename()).toMatch(/^customer-collections-.*\.pdf$/);
  });

  // ─── Regresión: Corte de Ventas con detalle de tickets + Excel ─────────────

  test("R6 — /reports/sales-cut: detalle de tickets y export Excel con datos reales (regresión)", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports/sales-cut`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Corte de Ventas" })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("Detalle de tickets")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("E2E-TK-000001")).toBeVisible({ timeout: 8000 });

    const [xlsxDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Exportar Excel/i }).click(),
    ]);
    expect(xlsxDownload.suggestedFilename()).toMatch(/^sales-cut-.*\.xlsx$/);
  });

  // ─── Regresión: Estados de Cuenta con export Excel ──────────────────────────

  test("R7 — /reports/account-statements: export Excel con datos reales (regresión)", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports/account-statements`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Estados de Cuenta" })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText("E2E Cliente Reportes")).toBeVisible({ timeout: 8000 });

    const [xlsxDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: /Exportar Excel/i }).click(),
    ]);
    expect(xlsxDownload.suggestedFilename()).toMatch(/^account-statements-.*\.xlsx$/);
  });
});
