import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

// e2e-admin creado por global-setup.ts (rol admin: waybills:read/write/cancel/stamp)
const ADMIN_EMAIL = "e2e-admin@agrisas.test";
const E2E_PASSWORD = "E2eTest1234!";

// Matriz — sucursal con stock real de ACTIVANE 1KG (verificado contra la DB antes de escribir este test)
const ORIGIN_BRANCH_ID = "07c69311-6ab9-446d-849e-4c99afef489e";
const DESTINATION_BRANCH_ID = "2fc0fab8-820b-49ca-90ef-b4a10a3c6d0e"; // Sucursal Neg Stock
const PRODUCT_ID = "5d362fc1-f678-4e0f-ac6d-2a89bd24ac9e"; // ACTIVANE 1KG

async function loginApi(email: string, password: string = E2E_PASSWORD): Promise<string> {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { accessToken?: string };
  if (!data.accessToken) throw new Error(`Login failed for ${email}: ${JSON.stringify(data)}`);
  return data.accessToken;
}

// NOTA: no se incluye un escenario de creación de traspaso Carta Porte en este smoke.
// A diferencia del traspaso simple (reversible, sin efectos externos), un traspaso Carta Porte
// exitoso timbra un CFDI real ante Facturama/SAT — un side effect fiscal irreversible que no
// se debe disparar desde un smoke test automatizado. Verificar ese flujo manualmente.

test("Traspaso simple — crear y cancelar (folio TRI, sin CFDI)", async () => {
  test.setTimeout(60000); // entorno con latencia alta observada hacia Supabase (ver design.md)
  const token = await loginApi(ADMIN_EMAIL);

  const createRes = await fetch(`${BASE}/api/v1/admin/waybills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: "simple",
      originBranchId: ORIGIN_BRANCH_ID,
      destinationBranchId: DESTINATION_BRANCH_ID,
      transferDate: new Date().toISOString(),
      notes: "Smoke test — traspaso-simple",
      items: [{ productId: PRODUCT_ID, description: "ACTIVANE 1KG", quantity: 1 }],
    }),
  });

  expect(createRes.status).toBe(201);
  const waybill = await createRes.json();
  expect(waybill.type).toBe("simple");
  expect(waybill.status).toBe("completed");
  expect(waybill.folioCode).toMatch(/^TRI-\d+$/);
  expect(waybill.cfdiUuid).toBeNull();

  const cancelRes = await fetch(`${BASE}/api/v1/admin/waybills/${waybill.id}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reason: "Smoke test cleanup" }),
  });

  expect(cancelRes.status).toBe(200);
  const cancelled = await cancelRes.json();
  expect(cancelled.status).toBe("cancelled");
});

test("Traspaso simple — 400 sin productId en la línea", async () => {
  const token = await loginApi(ADMIN_EMAIL);

  const res = await fetch(`${BASE}/api/v1/admin/waybills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: "simple",
      originBranchId: ORIGIN_BRANCH_ID,
      destinationBranchId: DESTINATION_BRANCH_ID,
      transferDate: new Date().toISOString(),
      items: [{ description: "Línea libre sin producto", quantity: 1 }],
    }),
  });

  expect(res.status).toBe(400);
});

test("Traspaso — 400 InvalidBranchPair cuando origen == destino", async () => {
  const token = await loginApi(ADMIN_EMAIL);

  const res = await fetch(`${BASE}/api/v1/admin/waybills`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      type: "simple",
      originBranchId: ORIGIN_BRANCH_ID,
      destinationBranchId: ORIGIN_BRANCH_ID,
      transferDate: new Date().toISOString(),
      items: [{ productId: PRODUCT_ID, description: "ACTIVANE 1KG", quantity: 1 }],
    }),
  });

  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error).toBe("InvalidBranchPair");
});
