import { test, expect, type Page } from "@playwright/test";

const BASE = "http://localhost:3001";
const ADMIN_EMAIL = "e2e-admin@agrisas.test";
const E2E_PASSWORD = "E2eTest1234!";

// ─── Builder de CFDI 4.0 para inyectar como archivo XML ────────────────────

interface CfdiConcepto {
  clave: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  tasaIva?: number;
}

interface CfdiOptions {
  emisorRfc: string;
  emisorNombre: string;
  serie?: string;
  folio?: string;
  fecha?: string;
  formaPago?: string;
  uuid?: string;
  conceptos: CfdiConcepto[];
}

function buildCfdi(o: CfdiOptions): string {
  const conceptoXml = o.conceptos
    .map((c) => {
      const importe = (c.cantidad * c.valorUnitario).toFixed(2);
      const traslados =
        c.tasaIva != null
          ? `<cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="${importe}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="${c.tasaIva.toFixed(6)}" Importe="${(parseFloat(importe) * c.tasaIva).toFixed(2)}"/></cfdi:Traslados></cfdi:Impuestos>`
          : `<cfdi:Impuestos><cfdi:Traslados><cfdi:Traslado Base="${importe}" Impuesto="002" TipoFactor="Exento"/></cfdi:Traslados></cfdi:Impuestos>`;
      return `<cfdi:Concepto ClaveProdServ="${c.clave}" NoIdentificacion="P1" Cantidad="${c.cantidad}" ClaveUnidad="H87" Unidad="Pieza" Descripcion="${c.descripcion}" ValorUnitario="${c.valorUnitario.toFixed(2)}" Importe="${importe}" ObjetoImp="02">${traslados}</cfdi:Concepto>`;
    })
    .join("\n      ");

  const totalTraslados = o.conceptos
    .filter((c) => c.tasaIva != null)
    .reduce((acc, c) => acc + c.cantidad * c.valorUnitario * (c.tasaIva as number), 0);
  const subTotal = o.conceptos.reduce((acc, c) => acc + c.cantidad * c.valorUnitario, 0);

  const timbre = o.uuid
    ? `<cfdi:Complemento><tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital" Version="1.1" UUID="${o.uuid}" FechaTimbrado="${o.fecha}T09:31:00" RfcProvCertif="AAA010101AAA" SelloCFD="abc" NoCertificadoSAT="00001000000000000000" SelloSAT="abc"/></cfdi:Complemento>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Version="4.0" Serie="${o.serie ?? "A"}" Folio="${o.folio ?? "1"}" Fecha="${o.fecha ?? "2026-08-05T09:30:00"}" Sello="abc" FormaPago="${o.formaPago ?? "03"}" NoCertificado="00001000000000000000" Certificado="abc" SubTotal="${subTotal.toFixed(2)}" Moneda="MXN" Total="${(subTotal + totalTraslados).toFixed(2)}" TipoDeComprobante="I" Exportacion="01" MetodoPago="PUE" LugarExpedicion="64000">
  <cfdi:Emisor Rfc="${o.emisorRfc}" Nombre="${o.emisorNombre}" RegimenFiscal="601"/>
  <cfdi:Receptor Rfc="ABC010101ABC" Nombre="RECEPTOR DEMO" DomicilioFiscalReceptor="64000" RegimenFiscalReceptor="601" UsoCFDI="G01"/>
  <cfdi:Conceptos>
      ${conceptoXml}
  </cfdi:Conceptos>
  <cfdi:Impuestos TotalImpuestosTrasladados="${totalTraslados.toFixed(2)}">
    <cfdi:Traslados>
      <cfdi:Traslado Base="${subTotal.toFixed(2)}" Impuesto="002" TipoFactor="Tasa" TasaOCuota="0.160000" Importe="${totalTraslados.toFixed(2)}"/>
    </cfdi:Traslados>
  </cfdi:Impuestos>
  ${timbre}
</cfdi:Comprobante>`;
}

// ─── Helpers de UI ──────────────────────────────────────────────────────────

async function loginUi(page: Page, email: string, password: string = E2E_PASSWORD) {
  await page.goto(`${BASE}/auth/login`);
  await page.waitForSelector('[name="email"]', { state: "visible" });
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|pos|purchases|inventory|catalogs|sales|quotes|returns)/, { timeout: 20000 });
}

async function gotoNewPurchase(page: Page) {
  await loginUi(page, ADMIN_EMAIL);
  await page.goto(`${BASE}/purchases/new`);
  await expect(page.getByRole("heading", { name: "Nueva compra" })).toBeVisible({ timeout: 15000 });
}

async function loadXml(page: Page, xml: string) {
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeEnabled({ timeout: 15000 });
  await page.setInputFiles('input[type="file"]', {
    name: "factura.xml",
    mimeType: "text/xml",
    buffer: Buffer.from(xml, "utf-8"),
  });
  await expect(page.getByText("Factura factura.xml")).toBeVisible({ timeout: 20000 });
}

async function selectBranch(page: Page, name: string) {
  const wrap = page.locator("label", { hasText: "Sucursal" }).locator("..");
  await wrap.locator("select").selectOption({ label: name });
}

const UUID_S1 = "11111111-1111-4111-8111-111111111111";
const UUID_S2 = "22222222-2222-4222-8222-222222222222";
const UUID_S3 = "33333333-3333-4333-8333-333333333333";

const XML_VALIDO = buildCfdi({
  emisorRfc: "XPO010101AA1",
  emisorNombre: "XPO PROVEEDOR SA DE CV",
  serie: "A",
  folio: "7",
  uuid: UUID_S1,
  conceptos: [{ clave: "01010101", descripcion: "Producto E2E", cantidad: 2, valorUnitario: 100, tasaIva: 0.16 }],
});

test("S1 — Cargar XML válido prellena proveedor, líneas, forma de pago, fecha y metadatos", async ({ page }) => {
  await gotoNewPurchase(page);
  await loadXml(page, XML_VALIDO);

  // Proveedor de la factura (newProvider)
  await expect(page.getByText(/Se creará al registrar la compra/)).toBeVisible();

  // Forma de pago derivada de FormaPago=03 → Transferencia
  const pmWrap = page.locator("label", { hasText: "Forma de pago" }).locator("..");
  await expect(pmWrap.locator("select option", { hasText: "Transferencia" })).toHaveCount(1, { timeout: 10000 });
  await expect(pmWrap.locator("select option:checked")).toHaveText("Transferencia");

  // Línea auto-mapeada por ClaveProdServ (desaparece el empty state)
  await expect(page.getByText("Aún no hay productos agregados")).not.toBeVisible();
  await expect(page.locator('input[inputmode="decimal"]').first()).toHaveValue("2");
  await expect(page.locator('input[inputmode="decimal"]').nth(1)).toHaveValue("100");

  // Fecha de compra prefill con la fecha de la factura
  await expect(page.locator('input[type="date"]')).toHaveValue("2026-08-05");

  // Metadatos CFDI
  await expect(page.getByText("UUID: " + UUID_S1)).toBeVisible();
  await expect(page.getByText("Folio fiscal: A-7")).toBeVisible();
});

test("S2 — Enviar compra desde factura crea proveedor y persiste metadatos", async ({ page }) => {
  const xml = buildCfdi({
    emisorRfc: "XYU010101BB2",
    emisorNombre: "XYU PROVEEDOR NUEVO SA DE CV",
    serie: "A",
    folio: "8",
    uuid: UUID_S2,
    conceptos: [{ clave: "01010101", descripcion: "Producto E2E", cantidad: 3, valorUnitario: 50, tasaIva: 0.16 }],
  });
  await gotoNewPurchase(page);
  await loadXml(page, xml);
  await expect(page.getByText(/Se creará al registrar la compra/)).toBeVisible();
  await selectBranch(page, "E2E Matriz");

  await page.getByRole("button", { name: "Registrar compra" }).click();
  await page.waitForURL(/\/purchases\/[0-9a-f-]{36}$/, { timeout: 25000 });

  // Detalle: proveedor auto-creado + metadatos CFDI visibles
  await expect(page.getByText("XYU PROVEEDOR NUEVO SA DE CV")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Factura SAT")).toBeVisible();
  await expect(page.getByText(UUID_S2)).toBeVisible();
  await expect(page.getByText("Folio fiscal: A-8")).toBeVisible();
});

test("S3 — UUID duplicado devuelve error inline al reenviar la misma factura", async ({ page }) => {
  const xml = buildCfdi({
    emisorRfc: "XPO010101AA1",
    emisorNombre: "XPO PROVEEDOR SA DE CV",
    serie: "A",
    folio: "9",
    uuid: UUID_S3,
    conceptos: [{ clave: "01010101", descripcion: "Producto E2E", cantidad: 1, valorUnitario: 100, tasaIva: 0.16 }],
  });

  // Primera carga: se crea la compra
  await gotoNewPurchase(page);
  await loadXml(page, xml);
  await selectBranch(page, "E2E Matriz");
  await page.getByRole("button", { name: "Registrar compra" }).click();
  await page.waitForURL(/\/purchases\/[0-9a-f-]{36}$/, { timeout: 25000 });

  // Segunda carga de la misma factura → 409 inline (ya autenticado)
  await page.goto(`${BASE}/purchases/new`);
  await expect(page.getByRole("heading", { name: "Nueva compra" })).toBeVisible({ timeout: 15000 });
  await loadXml(page, xml);
  await selectBranch(page, "E2E Matriz");
  await page.getByRole("button", { name: "Registrar compra" }).click();
  await expect(page.getByText("Este UUID de factura SAT ya está registrado en otra compra")).toBeVisible({ timeout: 15000 });
});

test("S4 — Concepto sin producto equivalente se avisa sin bloquear", async ({ page }) => {
  const xml = buildCfdi({
    emisorRfc: "XPO010101AA1",
    emisorNombre: "XPO PROVEEDOR SA DE CV",
    serie: "A",
    folio: "10",
    uuid: "44444444-4444-4444-8444-444444444444",
    conceptos: [{ clave: "99999999", descripcion: "Servicio sin catálogo", cantidad: 1, valorUnitario: 500 }],
  });
  await gotoNewPurchase(page);
  await loadXml(page, xml);
  await expect(page.getByText(/concepto sin producto equivalente/)).toBeVisible();
  await expect(page.getByText(/Servicio sin catálogo/)).toBeVisible();
  await expect(page.getByText(/Agrégalos manualmente con el buscador de productos/)).toBeVisible();
});

test("S5 — Diferencia de IVA entre producto y XML se avisa", async ({ page }) => {
  const xml = buildCfdi({
    emisorRfc: "XPO010101AA1",
    emisorNombre: "XPO PROVEEDOR SA DE CV",
    serie: "A",
    folio: "11",
    uuid: "55555555-5555-4555-8555-555555555555",
    conceptos: [{ clave: "01010101", descripcion: "Producto E2E", cantidad: 1, valorUnitario: 100, tasaIva: 0.08 }],
  });
  await gotoNewPurchase(page);
  await loadXml(page, xml);
  await expect(page.getByText(/IVA del producto "E2E-PROD-SAT" difiere del XML/)).toBeVisible();
});

test("S6 — XML inválido muestra error inline sin tocar el formulario", async ({ page }) => {
  await gotoNewPurchase(page);
  const fileInput = page.locator('input[type="file"]');
  await expect(fileInput).toBeEnabled({ timeout: 15000 });
  await page.setInputFiles('input[type="file"]', {
    name: "malo.xml",
    mimeType: "text/xml",
    buffer: Buffer.from("<root><sin/></root>", "utf-8"),
  });
  await expect(page.getByText(/No se encontró el nodo cfdi:Comprobante/)).toBeVisible({ timeout: 10000 });
  // El formulario sigue intacto: empty state de productos presente
  await expect(page.getByText("Aún no hay productos agregados")).toBeVisible();
});

test("S7 — Quitar factura limpia los metadatos y el proveedor", async ({ page }) => {
  await gotoNewPurchase(page);
  await loadXml(page, XML_VALIDO);
  await expect(page.getByText(/Se creará al registrar la compra/)).toBeVisible();

  await page.getByRole("button", { name: "Quitar", exact: true }).click();
  await expect(page.getByText(/Se creará al registrar la compra/)).not.toBeVisible();
  await expect(page.getByText("Factura factura.xml")).not.toBeVisible();
});
