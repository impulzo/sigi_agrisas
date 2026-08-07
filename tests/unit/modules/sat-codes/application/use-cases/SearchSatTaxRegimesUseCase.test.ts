import { InMemorySatTaxRegimeRepository } from "@/modules/sat-codes/infrastructure/repositories/InMemorySatTaxRegimeRepository";
import { SearchSatTaxRegimesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatTaxRegimesUseCase";

function seedRepo() {
  const repo = new InMemorySatTaxRegimeRepository();
  repo.seed([
    { code: "601", description: "General de Ley Personas Morales" },
    { code: "612", description: "Personas Físicas con Actividades Empresariales y Profesionales" },
    { code: "626", description: "Régimen Simplificado de Confianza" },
  ]);
  return repo;
}

describe("SearchSatTaxRegimesUseCase", () => {
  it("returns all seeded regimes when query is undefined", async () => {
    const repo = seedRepo();
    const result = await new SearchSatTaxRegimesUseCase(repo).execute(undefined);
    expect(result.items).toHaveLength(3);
  });

  it("filters by code substring", async () => {
    const repo = seedRepo();
    const result = await new SearchSatTaxRegimesUseCase(repo).execute("601");
    expect(result.items.map((i) => i.code)).toEqual(["601"]);
  });

  it("filters by description substring, case-insensitive", async () => {
    const repo = seedRepo();
    const result = await new SearchSatTaxRegimesUseCase(repo).execute("simplificado");
    expect(result.items).toEqual([
      { code: "626", description: "Régimen Simplificado de Confianza" },
    ]);
  });

  it("returns empty items when nothing matches", async () => {
    const repo = seedRepo();
    const result = await new SearchSatTaxRegimesUseCase(repo).execute("noexiste");
    expect(result.items).toEqual([]);
  });
});
