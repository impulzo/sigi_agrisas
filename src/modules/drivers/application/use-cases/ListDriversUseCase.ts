import { DriverRepository } from "../ports/DriverRepository";
import { ListDriversRequest } from "../dto/ListDriversRequest";
import { ListDriversResponse } from "../dto/ListDriversResponse";
import { toDriverDto } from "../mappers/toDriverDto";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export class ListDriversUseCase {
  constructor(private readonly repo: DriverRepository) {}

  async execute(req: ListDriversRequest): Promise<ListDriversResponse> {
    const page = Math.max(1, req.page);
    const pageSize = Math.min(req.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const { items, total } = await this.repo.findAll({
      page,
      pageSize,
      includeInactive: req.includeInactive,
      search: req.search,
    });

    return {
      items: items.map(toDriverDto),
      total,
      page,
      pageSize,
    };
  }
}
