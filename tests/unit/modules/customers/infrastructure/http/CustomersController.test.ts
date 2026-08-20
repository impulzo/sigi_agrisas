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
    expect(body.creditDays).toBe(30);
  });

  it("crea con creditDays custom y lo persiste", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, creditDays: 45 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.creditDays).toBe(45);
  });

  it("rechaza creditDays negativo → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, creditDays: -5 }));
    expect(res.status).toBe(400);
  });

  it("rechaza creditDays no entero → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, creditDays: 10.5 }));
    expect(res.status).toBe(400);
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

  it("crea sin rfc → 201 con rfc: null", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ code: "CLI001", name: "Acme S.A." }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.rfc).toBeNull();
  });

  it("dos clientes sin rfc coexisten sin conflicto 409", async () => {
    const { controller } = makeController();
    const res1 = await controller.create(postReq({ code: "CLI001", name: "A" }));
    const res2 = await controller.create(postReq({ code: "CLI002", name: "B" }));
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
  });

  it("rechaza initialBalance negativo → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, initialBalance: -100 }));
    expect(res.status).toBe(400);
  });

  it("crea con initialBalance y fija currentBalance al mismo valor", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, initialBalance: 1000 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.initialBalance).toBe(1000);
    expect(body.currentBalance).toBe(1000);
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

  it("cfdiUse de 4 caracteres (CP01) es aceptado", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, cfdiUse: "CP01" }));
    expect(res.status).toBe(201);
  });

  it("taxZipCode con formato incorrecto → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, taxZipCode: "1234" }));
    expect(res.status).toBe(400);
  });

  it("crea con dirección estructurada completa y default addressCountry=MEX si no se envía", async () => {
    const { controller } = makeController();
    const res = await controller.create(
      postReq({
        ...VALID_BODY,
        addressStreet: "Av. Reforma",
        addressExteriorNumber: "123",
        addressNeighborhood: "Centro",
        addressMunicipality: "Cuauhtémoc",
        addressState: "CMX",
        addressZipCode: "06000",
      })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.addressStreet).toBe("Av. Reforma");
    expect(body.addressCountry).toBe("MEX");
  });

  it("addressState con formato incorrecto → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, addressState: "cmx" }));
    expect(res.status).toBe(400);
  });

  it("addressZipCode con formato incorrecto → 400", async () => {
    const { controller } = makeController();
    const res = await controller.create(postReq({ ...VALID_BODY, addressZipCode: "123" }));
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

  it("creditDays como único campo actualiza y no falla por 'al menos un campo'", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ creditDays: 60 }), created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.creditDays).toBe(60);
  });

  it("initialBalance como único campo en update ajusta currentBalance por delta", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq({ ...VALID_BODY, initialBalance: 1000 }));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ initialBalance: 1300 }), created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.initialBalance).toBe(1300);
    expect(body.currentBalance).toBe(1300);
  });

  it("initialBalance negativo en update → 400", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ initialBalance: -100 }), created.id);
    expect(res.status).toBe(400);
  });

  it("creditDays negativo en update → 400", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ creditDays: -1 }), created.id);
    expect(res.status).toBe(400);
  });

  it("addressZipCode como único campo actualiza y no falla por 'al menos un campo'", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ addressZipCode: "06000" }), created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.addressZipCode).toBe("06000");
  });

  it("addressStreet nulo en update lo limpia", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq({ ...VALID_BODY, addressStreet: "Av. Reforma" }));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ addressStreet: null }), created.id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.addressStreet).toBeNull();
  });

  it("addressState con formato incorrecto en update → 400", async () => {
    const { controller } = makeController();
    const createRes = await controller.create(postReq(VALID_BODY));
    const created = await createRes.json();
    const res = await controller.update(patchReq({ addressState: "cmx" }), created.id);
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
