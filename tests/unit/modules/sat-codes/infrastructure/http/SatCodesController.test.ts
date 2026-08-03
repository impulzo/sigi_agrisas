import { NextRequest } from "next/server";
import { SatCodesController } from "@/modules/sat-codes/infrastructure/http/SatCodesController";
import { SearchSatCodesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatCodesUseCase";
import { InMemorySatCodeRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatCodeRepository";

function buildController(): { controller: SatCodesController; repo: InMemorySatCodeRepository } {
  const repo = new InMemorySatCodeRepository();
  repo.seed([
    { code: "10191501", description: "Fertilizantes nitrogenados" },
    { code: "10191506", description: "Fertilizantes fosfatados" },
    { code: "10161500", description: "Semillas de cultivos" },
  ]);
  const controller = new SatCodesController(new SearchSatCodesUseCase(repo));
  return { controller, repo };
}

function getReq(url: string): NextRequest {
  return new NextRequest(url);
}

describe("SatCodesController", () => {
  it("returns matching items for a valid search", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes?search=fertil"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(2);
  });

  it("returns 400 when search is shorter than 2 characters", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes?search=a"));
    expect(res.status).toBe(400);
  });

  it("returns the initial page when search is omitted", async () => {
    const { controller } = buildController();
    const res = await controller.search(getReq("http://localhost/api/v1/admin/sat-codes"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toHaveLength(3);
  });
});
