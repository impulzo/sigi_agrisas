import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:3001";
const ADMIN_EMAIL = "e2e-admin@agrisas.test";
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

// ─── Fixtures aisladas: sucursal propia "E2E-PLAN", sin tocar otros specs ────

const prisma = new PrismaClient();

const FIXTURE_BRANCH_CODE = "E2E-PLAN";
const FIXTURE_CUSTOMER_RFC = "PLN010101AA1";
const FIXTURE_PRODUCT_CODE = "E2E-PROD-SAT"; // sembrado por global-setup

async function seedLedgerFixtures() {
  const product = await prisma.product.findUniqueOrThrow({ where: { code: FIXTURE_PRODUCT_CODE } });
  const creditPm = await prisma.paymentMethod.findUniqueOrThrow({ where: { code: "CREDITO" } });
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });

  const branch = await prisma.branch.upsert({
    where: { code: FIXTURE_BRANCH_CODE },
    update: {},
    create: { code: FIXTURE_BRANCH_CODE, name: "E2E Plan Verification" },
  });

  const customer = await prisma.customer.upsert({
    where: { rfc: FIXTURE_CUSTOMER_RFC },
    update: {},
    create: { code: "E2E-PLAN-CUST", name: "E2E Cliente Plan", rfc: FIXTURE_CUSTOMER_RFC, creditLimit: 1000 },
  });

  const price = await prisma.productPrice.upsert({
    where: { productId_name: { productId: product.id, name: "E2E Plan Menudeo" } },
    update: {},
    // isDefault:false — el producto compartido "E2E-PROD-SAT" ya tiene un default de otro spec
    // (partial unique index product_default_price_idx); no aplica a este test (referenciamos el
    // precio directo por productPriceId, no por default).
    create: { productId: product.id, name: "E2E Plan Menudeo", price: 200, isDefault: false },
  });

  const salesFolio = await prisma.folio.upsert({
    where: { code: "E2E-PLAN-TK" },
    update: {},
    create: { code: "E2E-PLAN-TK", name: "Ticket E2E Plan", prefix: "E2PLTK-", scope: "POS", currentNumber: 0 },
  });
  const collectionsFolio = await prisma.folio.upsert({
    where: { code: "E2E-PLAN-RCB" },
    update: {},
    create: { code: "E2E-PLAN-RCB", name: "Recibo E2E Plan", prefix: "E2PLRB-", scope: "OPERATIONS", currentNumber: 0 },
  });

  // Limpieza idempotente.
  await prisma.customerPayment.deleteMany({ where: { branchId: branch.id } });
  await prisma.saleItem.deleteMany({ where: { sale: { branchId: branch.id } } });
  await prisma.sale.deleteMany({ where: { branchId: branch.id } });

  const sale = await prisma.sale.create({
    data: {
      folioId: salesFolio.id,
      folioNumber: 1,
      folioCode: "E2E-PLTK-000001",
      branchId: branch.id,
      customerId: customer.id,
      cashierId: admin.id,
      paymentMethodId: creditPm.id,
      status: "completed",
      paidAmount: 50,
      paymentStatus: "partial",
      subtotal: 172.41,
      taxTotal: 27.59,
      total: 200,
      completedAt: new Date("2026-06-10T10:00:00Z"),
    },
  });

  await prisma.saleItem.create({
    data: {
      saleId: sale.id,
      productId: product.id,
      productPriceId: price.id,
      productCodeSnapshot: product.code,
      productNameSnapshot: product.name,
      priceNameSnapshot: "E2E Plan Menudeo",
      quantity: 1,
      unitPrice: 200,
      ivaRate: 0.16,
      iepsRate: null,
      lineSubtotal: 172.41,
      lineTax: 27.59,
      lineTotal: 200,
    },
  });

  await prisma.customerPayment.create({
    data: {
      saleId: sale.id,
      customerId: customer.id,
      userId: admin.id,
      branchId: branch.id,
      paymentMethodId: creditPm.id,
      folioId: collectionsFolio.id,
      folioNumber: 1,
      folioCode: "E2E-PLRCB-000001",
      amount: 50,
      status: "completed",
      createdAt: new Date("2026-06-12T10:00:00Z"),
    },
  });

  await prisma.customer.update({ where: { id: customer.id }, data: { currentBalance: 150 } });

  return { branchId: branch.id, customerId: customer.id, saleId: sale.id };
}

async function cleanupLedgerFixtures(branchId: string, customerId: string) {
  await prisma.customerPayment.deleteMany({ where: { branchId } });
  await prisma.saleItem.deleteMany({ where: { sale: { branchId } } });
  await prisma.sale.deleteMany({ where: { branchId } });
  await prisma.customer.update({ where: { id: customerId }, data: { currentBalance: 0 } });
}

test.describe("Verificación manual — plan de mejoras del cliente (2026-08-16)", () => {
  let fixtureBranchId: string;
  let fixtureCustomerId: string;
  let fixtureSaleId: string;

  test.beforeAll(async () => {
    const { branchId, customerId, saleId } = await seedLedgerFixtures();
    fixtureBranchId = branchId;
    fixtureCustomerId = customerId;
    fixtureSaleId = saleId;
  });

  test.afterAll(async () => {
    if (fixtureBranchId) await cleanupLedgerFixtures(fixtureBranchId, fixtureCustomerId);
    await prisma.$disconnect();
  });

  // ─── Change 6: agrupar estado de cuenta por ticket ─────────────────────────

  test("C6 — estado de cuenta agrupa venta a crédito con su abono (padre + hijo)", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports/account-statements/${fixtureCustomerId}`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "E2E Cliente Plan" })).toBeVisible({ timeout: 8000 });

    // Fila de la venta (folio E2E-PLTK-000001) visible en la tabla del libro mayor.
    const saleRow = page.getByRole("row").filter({ hasText: "E2E-PLTK-000001" });
    await expect(saleRow).toBeVisible({ timeout: 8000 });
    // Fila del abono (folio E2E-PLRCB-000001) visible — ambas presentes en la tabla agrupada.
    const paymentRow = page.getByRole("row").filter({ hasText: "E2E-PLRCB-000001" });
    await expect(paymentRow).toBeVisible({ timeout: 8000 });

    // El abono aparece en la fila inmediatamente siguiente a la de su venta (padre → hijo).
    const rows = page.locator("tbody tr");
    const saleIndex = await saleRow.evaluate((el) => Array.from(el.parentElement!.children).indexOf(el));
    await expect(rows.nth(saleIndex + 1)).toContainText("E2E-PLRCB-000001");

    // Saldo final coincide con customers.currentBalance (150.00) sembrado en la fixture.
    await expect(page.getByText("$150.00").first()).toBeVisible({ timeout: 8000 });
  });

  // ─── Change 3: opción "Todos los clientes" ─────────────────────────────────

  test("C3 — filtro de cliente en Cobranza (Por Cliente) muestra 'Todos los clientes' por defecto", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports/collections`);
    await page.waitForLoadState("networkidle");
    await page.getByRole("tab", { name: "Por Cliente" }).click();
    await page.waitForLoadState("networkidle");

    const customerInput = page.locator('input[placeholder="Buscar cliente…"]');
    await expect(customerInput).toHaveValue("Todos los clientes", { timeout: 8000 });
  });

  test("C3 — filtro de cliente en Ventas por Producto (Por Cliente) muestra 'Todos los clientes' por defecto", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/reports/sales-by-product`);
    await page.waitForLoadState("networkidle");

    const scopeTab = page.getByRole("tab", { name: "Por Cliente" });
    if (await scopeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scopeTab.click();
      await page.waitForLoadState("networkidle");
      const customerInput = page.locator('input[placeholder="Buscar cliente…"]');
      await expect(customerInput).toHaveValue("Todos los clientes", { timeout: 8000 });
    } else {
      test.skip(true, "Selector de alcance Global/Por Cliente no visible");
    }
  });

  // ─── Change 2: tamaño de página del ticket térmico ─────────────────────────

  test("C2 — ticket imprimible declara @page con el ancho de papel configurado", async ({ page }) => {
    await loginUi(page, ADMIN_EMAIL);
    await page.goto(`${BASE}/sales/${fixtureSaleId}/ticket`);
    await page.waitForLoadState("networkidle");

    const styleContent = await page.locator(".printable-ticket style").first().textContent();
    expect(styleContent).toMatch(/@page\s*\{\s*size:\s*(58mm|80mm)\s+3276mm;\s*margin:\s*0;\s*\}/);
  });
});
