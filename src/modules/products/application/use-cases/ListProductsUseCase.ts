import { ProductRepository } from "../ports/ProductRepository";
import { ListProductsRequest } from "../dto/ListProductsRequest";
import { ListProductsResponse } from "../dto/ListProductsResponse";
import { toProductDto } from "../mappers/toProductDto";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export class ListProductsUseCase {
  constructor(private readonly repo: ProductRepository) {}

  async execute(req: ListProductsRequest): Promise<ListProductsResponse> {
    const page = Math.max(1, req.page);
    const pageSize = Math.min(req.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const { items, total } = await this.repo.findAll({
      page,
      pageSize,
      includeInactive: req.includeInactive,
      search: req.search,
      departmentId: req.departmentId,
    });

    return {
      items: items.map(toProductDto),
      total,
      page,
      pageSize,
    };
  }
}
