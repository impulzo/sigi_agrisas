import { NextRequest } from "next/server";
import { TaxRatesController } from "@/modules/tax-rates/infrastructure/http/TaxRatesController";
import { InMemoryTaxRateRepository } from "@/modules/tax-rates/infrastructure/repositories/InMemoryTaxRateRepository";
import { ListTaxRatesUseCase } from "@/modules/tax-rates/application/use-cases/ListTaxRatesUseCase";
import { GetTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/GetTaxRateUseCase";
import { CreateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/CreateTaxRateUseCase";
import { UpdateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/UpdateTaxRateUseCase";
import { DeactivateTaxRateUseCase } from "@/modules/tax-rates/application/use-cases/DeactivateTaxRateUseCase";

const VALID_BODY = {
  code: "IVA_16",
  name: "IVA 16%",
  satTaxCode: "002",
  factorType: "Tasa",
  displayValue: 16,
  rate: 0.16,
};

function buildController(): { controller: TaxRatesController; repo: InMemoryTaxRateRepository } {
  const repo = new InMemoryTaxRateRepository();
  const controller = new TaxRatesController(
    new ListTaxRatesUseCase(repo),
    new GetTaxRateUseCase(repo),
    new CreateTaxRateUseCase(repo),
    new UpdateTaxRateUseCase(repo),
    new DeactivateTaxRateUseCase(repo)
  );
  return { controller, repo };
}

function getReq(url = "http://localhost/test"): NextRequest {
  return new NextRequest(url);
}

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/test", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function patchReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/test", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("TaxRatesController — create", () => {
  it("crea una tasa y devuelve 201", async () => {
    const { controller } = buildController();
    const res = await controller.create(postReq(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.code).toBe("IVA_16");
    expect(body.rate).toBe(0.16);
  });

  it("rechaza código duplicado con 409", async () => {
    const { controller } = buildController();
    await controller.create(postReq(VALID_BODY));
    const res = await controller.create(postReq({ ...VALID_BODY, name: "IVA 16% duplicado" }));
    expect(res.status).toBe(409);
  });

  it("rechaza rate > 1 para factorType Tasa con 400", async () => {
    const { controller } = buildController();
    const res = await controller.create(postReq({ ...VALID_BODY, rate: 1.5 }));
    expect(res.status).toBe(400);
  });

  it("permite rate > 1 para factorType Cuota", async () => {
    const { controller } = buildController();
    const res = await controller.create(
      postReq({ ...VALID_BODY, code: "CUOTA_1", factorType: "Cuota", rate: 3.5 })
    );
    expect(res.status).toBe(201);
  });

  it("rechaza body vacío con 400", async () => {
    const { controller } = buildController();
    const res = await controller.create(postReq({}));
    expect(res.status).toBe(400);
  });
});

describe("TaxRatesController — update", () => {
  it("actualiza rate y no afecta el código", async () => {
    const { controller } = buildController();
    const created = await controller.create(postReq(VALID_BODY));
    const { id } = await created.json();

    const res = await controller.update(patchReq({ rate: 0.08 }), id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rate).toBe(0.08);
  });

  it("ignora code silenciosamente en el body", async () => {
    const { controller } = buildController();
    const created = await controller.create(postReq(VALID_BODY));
    const { id } = await created.json();

    const res = await controller.update(patchReq({ code: "OTRO_CODIGO", name: "IVA 16% actualizado" }), id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe("IVA_16");
    expect(body.name).toBe("IVA 16% actualizado");
  });

  it("rechaza body vacío con 400", async () => {
    const { controller } = buildController();
    const created = await controller.create(postReq(VALID_BODY));
    const { id } = await created.json();

    const res = await controller.update(patchReq({}), id);
    expect(res.status).toBe(400);
  });

  it("404 si la tasa no existe", async () => {
    const { controller } = buildController();
    const res = await controller.update(patchReq({ name: "X" }), "00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("TaxRatesController — deactivate", () => {
  it("desactiva una tasa sin productos activos", async () => {
    const { controller } = buildController();
    const created = await controller.create(postReq(VALID_BODY));
    const { id } = await created.json();

    const res = await controller.deactivate(getReq(), id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isActive).toBe(false);
  });

  it("409 TaxRateInUse cuando hay productos activos asociados", async () => {
    const { controller, repo } = buildController();
    const created = await controller.create(postReq(VALID_BODY));
    const { id } = await created.json();
    repo.setActiveProductCount(id, 3);

    const res = await controller.deactivate(getReq(), id);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe("TaxRateInUse");
    expect(body.productCount).toBe(3);
  });

  it("es idempotente al desactivar dos veces", async () => {
    const { controller } = buildController();
    const created = await controller.create(postReq(VALID_BODY));
    const { id } = await created.json();

    await controller.deactivate(getReq(), id);
    const res = await controller.deactivate(getReq(), id);
    expect(res.status).toBe(200);
  });

  it("404 si la tasa no existe", async () => {
    const { controller } = buildController();
    const res = await controller.deactivate(getReq(), "00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });
});

describe("TaxRatesController — get", () => {
  it("devuelve 200 con la tasa existente", async () => {
    const { controller } = buildController();
    const created = await controller.create(postReq(VALID_BODY));
    const { id } = await created.json();

    const res = await controller.getById(getReq(), id);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(id);
  });

  it("devuelve 404 si no existe", async () => {
    const { controller } = buildController();
    const res = await controller.getById(getReq(), "00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(404);
  });

  it("devuelve 400 con id inválido", async () => {
    const { controller } = buildController();
    const res = await controller.getById(getReq(), "not-a-uuid");
    expect(res.status).toBe(400);
  });
});

describe("TaxRatesController — list", () => {
  it("devuelve sólo tasas activas por default", async () => {
    const { controller } = buildController();
    const active = await controller.create(postReq(VALID_BODY));
    const { id: activeId } = await active.json();
    const inactive = await controller.create(postReq({ ...VALID_BODY, code: "IVA_0" }));
    const { id: inactiveId } = await inactive.json();
    await controller.deactivate(getReq(), inactiveId);

    const res = await controller.list(getReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items.map((i: { id: string }) => i.id)).toEqual([activeId]);
  });

  it("incluye inactivas con includeInactive=true", async () => {
    const { controller } = buildController();
    await controller.create(postReq(VALID_BODY));
    const inactive = await controller.create(postReq({ ...VALID_BODY, code: "IVA_0" }));
    const { id: inactiveId } = await inactive.json();
    await controller.deactivate(getReq(), inactiveId);

    const res = await controller.list(getReq("http://localhost/test?includeInactive=true"));
    const body = await res.json();
    expect(body.total).toBe(2);
  });
});
