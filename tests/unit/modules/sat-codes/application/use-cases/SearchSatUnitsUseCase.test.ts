import { InMemorySatUnitRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatUnitRepository";
import { SearchSatUnitsUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatUnitsUseCase";

function seedRepo() {
  const repo = new InMemorySatUnitRepository();
  repo.seed([
    { code: "KGM", description: "Kilogramo" },
    { code: "H87", description: "Pieza" },
    { code: "LTR", description: "Litro" },
  ]);
  return repo;
}

describe("SearchSatUnitsUseCase", () => {
  it("returns all seeded units when query is undefined", async () => {
    const repo = seedRepo();
    const result = await new SearchSatUnitsUseCase(repo).execute(undefined);
    expect(result.items).toHaveLength(3);
  });

  it("filters by code substring", async () => {
    const repo = seedRepo();
    const result = await new SearchSatUnitsUseCase(repo).execute("KG");
    expect(result.items).toEqual([{ code: "KGM", description: "Kilogramo" }]);
  });

  it("filters by description substring, case-insensitive", async () => {
    const repo = seedRepo();
    const result = await new SearchSatUnitsUseCase(repo).execute("pieza");
    expect(result.items).toEqual([{ code: "H87", description: "Pieza" }]);
  });

  it("returns empty items when nothing matches", async () => {
    const repo = seedRepo();
    const result = await new SearchSatUnitsUseCase(repo).execute("noexiste");
    expect(result.items).toEqual([]);
  });
});
