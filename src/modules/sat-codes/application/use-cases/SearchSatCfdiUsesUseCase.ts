import { SatCfdiUseRepository } from "../ports/SatCfdiUseRepository";
import { SearchSatCodesResponse } from "../dto/SatCodeDto";

const DEFAULT_LIMIT = 20;

export class SearchSatCfdiUsesUseCase {
  constructor(private readonly repo: SatCfdiUseRepository) {}

  async execute(query: string | undefined): Promise<SearchSatCodesResponse> {
    const items = await this.repo.search(query, DEFAULT_LIMIT);
    return { items };
  }
}
