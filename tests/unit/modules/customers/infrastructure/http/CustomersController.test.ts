import { NextRequest } from "next/server";
import { CustomersController } from "@/modules/customers/infrastructure/http/CustomersController";
import { InMemoryCustomerRepository } from "@/modules/customers/infrastructure/repositories/InMemoryCustomerRepository";
import { ListCustomersUseCase } from "@/modules/customers/application/use-cases/ListCustomersUseCase";
import { GetCustomerUseCase } from "@/modules/customers/application/use-cases/GetCustomerUseCase";
import { CreateCustomerUseCase } from "@/modules/customers/application/use-cases/CreateCustomerUseCase";
import { UpdateCustomerUseCase } from "@/modules/customers/application/use-cases/UpdateCustomerUseCase";
import { SoftDeleteCustomerUseCase } from "@/modules/customers/application/use-cases/SoftDeleteCustomerUseCase";

const VALID_UUID = "11111111-1111-1111-1111-111111111111";

function makeController() {
  const repo = new InMemoryCustomerRepository();
  const controller = new CustomersController(
    new ListCustomersUseCase(repo),
    new GetCustomerUseCase(repo),
    new CreateCustomerUseCase(repo),
    new UpdateCustomerUseCase(repo),
    new SoftDeleteCustomerUseCase(repo)
  );
  return { controller, repo };
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchReq(body: unknown, id = VALID_UUID): NextRequest {
  return new NextRequest(`http://localhost/customers/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getReq(qs = ""): NextRequest {
  return new NextRequest(`http://localhost/customers${qs}`);
}

const VALID_BODY = {
  code: "CLI001",
  name: "Acme S.A.",
  rfc: "ACM010101AAA",
};

// ────────────────────────────────────────────────────────────
// POST /customers — validación Zod
// ────────────────────────────────────────────────────────────

describe("CustomersController — POST create", () => {
  it("devuelve 201 con body mínimo válido", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("CLI001");
    expect(body.currentBalance).toBe(0);
    expect(body.creditLimit).toBeNull();
  });

  it("normaliza code a mayúsculas y trim antes de persistir", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, code: "  cli_001  " }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("CLI_001");
  });

  it("normaliza rfc a mayúsculas y trim", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, rfc: "  acm010101aaa  " }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rfc).toBe("ACM010101AAA");
  });

  it("rechaza rfc con formato inválido → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, rfc: "XXX" }));
    expect(res.status).toBe(400);
  });

  it("rechaza email malformado → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("rechaza creditLimit negativo → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, creditLimit: -1 }));
    expect(res.status).toBe(400);
  });

  it("ignora currentBalance en body (siempre 0)", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, currentBalance: 9999 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.currentBalance).toBe(0);
  });

  it("code duplicado → 409", async () => {
    const { controller } = makeController();
    await controller.create(postReq(VALID_BODY));
    const res = await controller.create(postReq({ ...VALID_BODY, rfc: "OTR010101AAA" }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/code/i);
  });

  it("rfc duplicado → 409", async () => {
    const { controller } = makeController();
    await controller.create(postReq(VALID_BODY));
    const res = await controller.create(postReq({ code: "CLI002", name: "Otro", rfc: VALID_BODY.rfc }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/rfc/i);
  });

  it("body vacío → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({}));
    expect(res.status).toBe(400);
  });

  it("taxRegime con formato incorrecto → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, taxRegime: "AB" }));
    expect(res.status).toBe(400);
  });

  it("cfdiUse con formato incorrecto → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, cfdiUse: "123" }));
    expect(res.status).toBe(400);
  });

  it("taxZipCode con formato incorrecto → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, taxZipCode: "1234" }));
    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────────────────────
// GET /customers — validación de query params
// ────────────────────────────────────────────────────────────

describe("CustomersController — GET list", () => {
  it("devuelve 200 con lista vacía por defecto", async () => {
    const { controller } = makeController();
    const res = await controller.list(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  it("pageSize > 100 → 400", async () => {
    const { controller } = makeController();
    const res = await controller.list(getReq("?pageSize=200"));
    expect(res.status).toBe(400);
  });

  it("search con 1 carácter → 400", async () => {
    const { controller } = makeController();
    const res = await controller.list(getReq("?search=a"));
    expect(res.status).toBe(400);
  });

  it("search con 2 caracteres → 200", async () => {
    const { controller } = makeController();
    const res = await controller.list(getReq("?search=ac"));
    expect(res.status).toBe(200);
  });
});

// ────────────────────────────────────────────────────────────
// GET /customers/:id
// ────────────────────────────────────────────────────────────

describe("CustomersController — GET by ID", () => {
  it("id no UUID → 400", async () => {
    const { controller } = makeController();
    const res = await controller.getById(getReq(), "not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("cliente no encontrado → 404", async () => {
    const { controller } = makeController();
    const res = await controller.getById(getReq(), VALID_UUID);
    expect(res.status).toBe(404);
  });

  it("cliente encontrado → 200", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.getById(getReq(), created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("CLI001");
  });
});

// ────────────────────────────────────────────────────────────
// PATCH /customers/:id — validación
// ────────────────────────────────────────────────────────────

describe("CustomersController — PATCH update", () => {
  it("body vacío → 400", async () => {
    const { controller } = makeController();
    const res = await controller.update(patchReq({}), VALID_UUID);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/at least one/i);
  });

  it("id no UUID → 400", async () => {
    const { controller } = makeController();
    const res = await controller.update(patchReq({ name: "X" }), "bad-id");
    expect(res.status).toBe(400);
  });

  it("cliente no encontrado → 404", async () => {
    const { controller } = makeController();
    const res = await controller.update(patchReq({ name: "Nuevo Nombre" }), VALID_UUID);
    expect(res.status).toBe(404);
  });

  it("ignora code y currentBalance en body", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.update(
      patchReq({ code: "HACKED", currentBalance: 99999, name: "Nombre Nuevo" }),
      created.id
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("CLI001");
    expect(body.currentBalance).toBe(0);
    expect(body.name).toBe("Nombre Nuevo");
  });

  it("rfc duplicado en update → 409", async () => {
    const { controller } = makeController();
    await controller.create(postReq(VALID_BODY));
    const res2 = await controller.create(postReq({ code: "CLI002", name: "Otro", rfc: "OTR010101AAA" }));
    const second = await res2.json();
    const res = await controller.update(patchReq({ rfc: VALID_BODY.rfc }), second.id);
    expect(res.status).toBe(409);
  });

  it("email inválido en update → 400", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ email: "not-email" }), created.id);
    expect(res.status).toBe(400);
  });

  it("creditLimit negativo en update → 400", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ creditLimit: -500 }), created.id);
    expect(res.status).toBe(400);
  });
});

// ────────────────────────────────────────────────────────────
// DELETE /customers/:id
// ────────────────────────────────────────────────────────────

describe("CustomersController — DELETE soft delete", () => {
  it("id no UUID → 400", async () => {
    const { controller } = makeController();
    const res = await controller.softDelete(getReq(), "not-a-uuid");
    expect(res.status).toBe(400);
  });

  it("cliente no encontrado → 404", async () => {
    const { controller } = makeController();
    const res = await controller.softDelete(getReq(), VALID_UUID);
    expect(res.status).toBe(404);
  });

  it("soft delete exitoso → 204", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.softDelete(getReq(), created.id);
    expect(res.status).toBe(204);
  });

  it("después de soft delete, isActive=false (reactivable vía PATCH)", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    await controller.softDelete(getReq(), created.id);
    const reactivate = await controller.update(patchReq({ isActive: true }), created.id);
    expect(reactivate.status).toBe(200);
    const body = await reactivate.json();
    expect(body.isActive).toBe(true);
  });
});
