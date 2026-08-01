import { SatCodeRepository } from "../ports/SatCodeRepository";
import { SearchSatCodesResponse } from "../dto/SatCodeDto";

const DEFAULT_LIMIT = 20;

export class SearchSatCodesUseCase {
  constructor(private readonly repo: SatCodeRepository) {}

  async execute(query: string | undefined): Promise<SearchSatCodesResponse> {
    const items = await this.repo.search(query, DEFAULT_LIMIT);
    return { items };
  }
}
