import { InMemorySatCfdiUseRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatCfdiUseRepository";
import { SearchSatCfdiUsesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatCfdiUsesUseCase";

function seedRepo() {
  const repo = new InMemorySatCfdiUseRepository();
  repo.seed([
    { code: "G01", description: "Adquisición de mercancías." },
    { code: "G03", description: "Gastos en general." },
    { code: "CP01", description: "Pagos" },
    { code: "CN01", description: "Nómina" },
  ]);
  return repo;
}

describe("SearchSatCfdiUsesUseCase", () => {
  it("returns all seeded uses when query is undefined", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCfdiUsesUseCase(repo).execute(undefined);
    expect(result.items).toHaveLength(4);
  });

  it("filters by code substring, case-insensitive", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCfdiUsesUseCase(repo).execute("g0");
    expect(result.items.map((i) => i.code)).toEqual(["G01", "G03"]);
  });

  it("filters by description substring, case-insensitive", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCfdiUsesUseCase(repo).execute("nómina");
    expect(result.items).toEqual([{ code: "CN01", description: "Nómina" }]);
  });

  it("returns 4-character codes like CP01 and CN01", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCfdiUsesUseCase(repo).execute("CP01");
    expect(result.items).toEqual([{ code: "CP01", description: "Pagos" }]);
  });

  it("returns empty items when nothing matches", async () => {
    const repo = seedRepo();
    const result = await new SearchSatCfdiUsesUseCase(repo).execute("noexiste");
    expect(result.items).toEqual([]);
  });
});
