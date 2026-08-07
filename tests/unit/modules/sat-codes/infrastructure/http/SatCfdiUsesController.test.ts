import { NextRequest } from "next/server";
import { SatCfdiUsesController } from "@/modules/sat-codes/infrastructure/http/SatCfdiUsesController";
import { SearchSatCfdiUsesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatCfdiUsesUseCase";
import { InMemorySatCfdiUseRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatCfdiUseRepository";

function buildController(): { controller: SatCfdiUsesController; repo: InMemorySatCfdiUseRepository } {
  const repo = new InMemorySatCfdiUseRepository();
  repo.seed([
    { code: "G01", description: "Adquisición de mercancías." },
    { code: "G03", description: "Gastos en general." },
    { code: "CP01", description: "Pagos" },
    { code: "CN01", description: "Nómina" },
  ]);
  const controller = new SatCfdiUsesController(new SearchSatCfdiUsesUseCase(repo));
  return { controller, repo };
}

function getReq(url: string): NextRequest {
  return new NextRequest(url);
}

describe("SatCfdiUsesController", () => {
  it("returns matching items for a valid search", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes/uso-cfdi?search=nómina"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toEqual({ code: "CN01", description: "Nómina" });
  });

  it("returns 4-character uses like CP01", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes/uso-cfdi?search=CP01"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items[0].code).toBe("CP01");
  });

  it("returns 400 when search is shorter than 2 characters", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes/uso-cfdi?search=1"));
    expect(res.status).toBe(400);
  });

  it("returns the initial page when search is omitted", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes/uso-cfdi"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(4);
  });
});
