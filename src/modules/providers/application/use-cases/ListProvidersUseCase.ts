import { ProviderRepository } from "../ports/ProviderRepository";
import { ListProvidersRequest } from "../dto/ListProvidersRequest";
import { ListProvidersResponse } from "../dto/ListProvidersResponse";
import { toProviderDto } from "../mappers/toProviderDto";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export class ListProvidersUseCase {
  constructor(private readonly repo: ProviderRepository) {}

  async execute(req: ListProvidersRequest): Promise<ListProvidersResponse> {
    const page = Math.max(1, req.page);
    const pageSize = Math.min(req.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const { items, total } = await this.repo.findAll({
      page,
      pageSize,
      includeInactive: req.includeInactive,
      search: req.search,
    });

    return {
      items: items.map(toProviderDto),
      total,
      page,
      pageSize,
    };
  }
}
