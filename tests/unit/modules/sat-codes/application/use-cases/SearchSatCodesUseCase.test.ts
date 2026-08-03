import { InMemorySatCodeRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatCodeRepository";
import { SearchSatCodesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatCodesUseCase";

function seedRepo() {
  const repo = new InMemorySatCodeRepository();
  repo.seed([
    { code: "10191501", description: "Fertilizantes nitrogenados" },
    { code: "10191506", description: "Fertilizantes fosfatados" },
    { code: "10161500", description: "Semillas de cultivos" },
  ]);
  return repo;
}

describe("SearchSatCodesUseCase", () => {
  it("returns all seeded codes when query is undefined", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCodesUseCase(repo).execute(undefined);
    expect(result.items).toHaveLength(3);
  });

  it("filters by code substring", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCodesUseCase(repo).execute("10191");
    expect(result.items.map((i) => i.code).sort()).toEqual(["10191501", "10191506"]);
  });

  it("filters by description substring, case-insensitive", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCodesUseCase(repo).execute("semillas");
    expect(result.items).toEqual([{ code: "10161500", description: "Semillas de cultivos" }]);
  });

  it("returns empty items when nothing matches", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCodesUseCase(repo).execute("noexiste");
    expect(result.items).toEqual([]);
  });
});
