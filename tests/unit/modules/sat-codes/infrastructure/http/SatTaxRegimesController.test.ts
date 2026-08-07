import { NextRequest } from "next/server";
import { SatTaxRegimesController } from "@/modules/sat-codes/infrastructure/http/SatTaxRegimesController";
import { SearchSatTaxRegimesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatTaxRegimesUseCase";
import { InMemorySatTaxRegimeRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatTaxRegimeRepository";

function buildController(): { controller: SatTaxRegimesController; repo: InMemorySatTaxRegimeRepository } {
  const repo = new InMemorySatTaxRegimeRepository();
  repo.seed([
    { code: "601", description: "General de Ley Personas Morales" },
    { code: "612", description: "Personas Físicas con Actividades Empresariales y Profesionales" },
    { code: "626", description: "Régimen Simplificado de Confianza" },
  ]);
  const controller = new SatTaxRegimesController(new SearchSatTaxRegimesUseCase(repo));
  return { controller, repo };
}

function getReq(url: string): NextRequest {
  return new NextRequest(url);
}

describe("SatTaxRegimesController", () => {
  it("returns matching items for a valid search", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes/regimen-fiscal?search=simplificado"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toEqual({ code: "626", description: "Régimen Simplificado de Confianza" });
  });

  it("returns 400 when search is shorter than 2 characters", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes/regimen-fiscal?search=a"));
    expect(res.status).toBe(400);
  });

  it("returns the initial page when search is omitted", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes/regimen-fiscal"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(3);
  });
});
