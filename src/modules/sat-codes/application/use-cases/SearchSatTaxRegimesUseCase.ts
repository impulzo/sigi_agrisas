import { SatTaxRegimeRepository } from "../ports/SatTaxRegimeRepository";
import { SearchSatCodesResponse } from "../dto/SatCodeDto";

const DEFAULT_LIMIT = 20;

export class SearchSatTaxRegimesUseCase {
  constructor(private readonly repo: SatTaxRegimeRepository) {}

  async execute(query: string | undefined): Promise<SearchSatCodesResponse> {
    const items = await this.repo.search(query, DEFAULT_LIMIT);
    return { items };
  }
}
