import { ReturnRepository } from "../ports/ReturnRepository";
import { ListReturnsRequest, ListReturnsResponse, ReturnDto } from "../dto/ReturnDto";
import { toReturnDto } from "../mappers/toReturnDto";

export class ListReturnsUseCase {
  constructor(private readonly returnRepo: ReturnRepository) {}

  async execute(req: ListReturnsRequest): Promise<ListReturnsResponse> {
    const { items, total } = await this.returnRepo.findAll({
      page: req.page,
      pageSize: req.pageSize,
      branchId: req.branchId,
      customerId: req.customerId,
      saleId: req.saleId,
      statuses: req.statuses,
      from: req.from,
      to: req.to,
      search: req.search,
    });

    const dtos: ReturnDto[] = items.map(({ return: ret, joined }) =>
      toReturnDto(ret, joined)
    );

    return { items: dtos, total, page: req.page, pageSize: req.pageSize };
  }
}
