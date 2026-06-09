import { SaleRepository } from "../ports/SaleRepository";
import { ListSalesRequest } from "../dto/ListSalesRequest";
import { ListSalesResponse } from "../dto/ListSalesResponse";
import { toSaleDto } from "../mappers/toSaleDto";

export class ListSalesUseCase {
  constructor(private readonly repo: SaleRepository) {}

  async execute(req: ListSalesRequest): Promise<ListSalesResponse> {
    const { items, total } = await this.repo.findAll(req);
    return {
      items: items.map(({ sale, joined }) => toSaleDto(sale, joined)),
      total,
      page: req.page,
      pageSize: req.pageSize,
    };
  }
}
