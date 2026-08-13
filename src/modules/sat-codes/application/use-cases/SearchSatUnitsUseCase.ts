import { SatUnitRepository } from "../ports/SatUnitRepository";
import { SearchSatUnitsResponse } from "../dto/SatUnitDto";

const DEFAULT_LIMIT = 20;

export class SearchSatUnitsUseCase {
  constructor(private readonly repo: SatUnitRepository) {}

  async execute(query: string | undefined): Promise<SearchSatUnitsResponse> {
    const items = await this.repo.search(query, DEFAULT_LIMIT);
    return { items };
  }
}
